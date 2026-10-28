import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { NEXT_ORDER_STATUS } from "@/constants/order-status";
import { cancelOrderAction, deleteOrderAction, recordOrderPaymentAction, saveOrderAction, setOrderStatusAction } from "@/lib/actions/order";
import { orderStatusCells } from "@/lib/helpers/order-status-cells";
import { orderTotals } from "@/lib/helpers/order-totals";
import { variantLabel } from "@/lib/helpers/variant-label";
import { fmtMoney, roundMoney } from "@/lib/utils/format-money";
import { newId } from "@/lib/utils/new-id";
import { confirm } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { OrderStatus } from "@/enums/order-status";
import type { CancellableRow, Order, OrderDraft, OrderPayment, OrderSubmitValues, PaymentSubmitValues } from "@/models/order";
import { useOptimisticRows, type OptimisticOp } from "../use-optimistic-rows";

export function useSubmitOrder() {
  const { products } = useLookupTables();

  // Resolves to a message when the order can't be saved; throws if the server save fails.
  return async function submitOrder(values: OrderSubmitValues, existing: Order | null): Promise<string | null> {
    const deliveryCharge = Math.abs(values.deliveryCharge || 0);
    const advance: OrderPayment | null =
      values.advance && values.advance.amount > 0 ? { id: existing?.advance?.id ?? newId(), ...values.advance } : null;
    // Payments recorded after the advance stay as they are.
    const laterPayments = existing ? existing.amountPaid - (existing.advance?.amount ?? 0) : 0;
    const amountPaid = roundMoney(laterPayments + (advance?.amount ?? existing?.advance?.amount ?? 0));
    const draft: OrderDraft = {
      id: existing?.id ?? newId(),
      customerId: values.customerId,
      orderDate: values.orderDate,
      status: values.status,
      items: values.items,
      deliveryCharge,
      deliveryLocation: values.deliveryLocation,
      deliveryProviderId: values.deliveryProviderId,
      paymentMethodId: values.paymentMethodId,
      requestedDate: values.requestedDate,
      note: values.note,
      amountPaid,
      ...orderTotals(values.items, deliveryCharge, amountPaid),
    };
    if (draft.totalPrice < amountPaid) {
      return `The total can't be less than the ${fmtMoney(amountPaid)} paid. Lower the advance, or correct the payments in Transactions.`;
    }
    // Requests are made to order, so their items (even once converted) never draw on stock.
    if (values.status !== "requested" && (existing ? existing.stockTracked : true)) {
      // Stock this order can still draw on: what's on the shelf plus what this order already holds.
      const held = new Map<string, number>();
      if (existing?.stockTracked) for (const i of existing.items) held.set(i.variantId, (held.get(i.variantId) ?? 0) + i.quantity);
      const variants = products.flatMap((p) => p.variants.map((v) => ({ p, v })));
      for (const item of values.items) {
        const found = variants.find(({ v }) => v.id === item.variantId);
        const available = found ? found.v.quantity + (held.get(item.variantId) ?? 0) : Infinity;
        if (found && item.quantity > available) {
          const label = variantLabel(found.p.optionNames, found.v.options);
          return `Not enough stock for ${found.p.name}${label ? ` · ${label}` : ""}: ${available} available.`;
        }
      }
    }
    await saveOrderAction(draft, advance);
    return null;
  };
}

async function submitPayment(values: PaymentSubmitValues) {
  const { paymentTarget: target, close } = useDialogStore.getState();
  if (!target) return;
  await recordOrderPaymentAction(target.orderId, { id: newId(), ...values });
  close();
}

export function useSubmitPayment() {
  return submitPayment;
}

export function useOrderRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const cancelOrder = useCallback(
    async (row: CancellableRow) => {
      const paidNote =
        row.amountPaid <= 0
          ? null
          : row.advanceAmount === row.amountPaid
            ? `The ${fmtMoney(row.amountPaid)} advance is kept as income.`
            : `The ${fmtMoney(row.amountPaid)} paid is kept as income.`;
      const stockNote =
        row.trackedUnits > 0 ? `${row.trackedUnits} item${row.trackedUnits === 1 ? " goes" : "s go"} back to stock.` : null;
      const kind = row.isRequest ? "request" : "order";
      const confirmed = await confirm({
        title: `Cancel ${kind} ${row.orderNumber}?`,
        description: [paidNote, stockNote, "This can't be undone."].filter(Boolean).join(" "),
        confirmLabel: `Cancel ${kind}`,
        cancelLabel: `Keep ${kind}`,
        destructive: true,
      });
      if (!confirmed) return;
      // A cancelled request leaves the Requests tab; an order stays listed, read-only.
      const op: OptimisticOp = row.isRequest
        ? { kind: "hide", id: row.id }
        : { kind: "patch", id: row.id, patch: { ...orderStatusCells("cancelled"), canEdit: false, canRecordPayment: false } };
      runOptimistic(op, () => cancelOrderAction(row.id), "Failed to cancel order");
    },
    [runOptimistic],
  );

  const deleteOrder = useCallback(
    async (row: { id: string; orderNumber: string; paymentCount: number }) => {
      const note =
        row.paymentCount > 0 ? `Its ${row.paymentCount} payment${row.paymentCount === 1 ? "" : "s"} stay in Transactions, unlinked.` : undefined;
      if (!(await confirm({ title: `Delete order ${row.orderNumber}?`, description: note, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteOrderAction(row.id), "Failed to delete order");
    },
    [runOptimistic],
  );

  const advanceOrderStatus = useCallback(
    (row: { id: string; orderStatus: OrderStatus }) => {
      const next = NEXT_ORDER_STATUS[row.orderStatus];
      if (!next) return;
      runOptimistic(
        { kind: "patch", id: row.id, patch: orderStatusCells(next.status) },
        () => setOrderStatusAction(row.id, next.status),
        "Failed to update order status",
      );
    },
    [runOptimistic],
  );

  return { visibleRows, cancelOrder, deleteOrder, advanceOrderStatus };
}
