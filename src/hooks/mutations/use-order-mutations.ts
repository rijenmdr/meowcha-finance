import { useCallback } from "react";
import { NEXT_ORDER_STATUS } from "@/constants/order-status";
import {
  cancelOrderAction,
  deleteOrderAction,
  mergeRequestAction,
  recordOrderPaymentAction,
  saveOrderAction,
  setOrderStatusAction,
} from "@/lib/actions/order";
import { orderStatusCells } from "@/lib/helpers/order-status-cells";
import { orderTotals } from "@/lib/helpers/order-totals";
import { fmtMoney, roundMoney } from "@/lib/utils/format-money";
import { newId } from "@/lib/utils/new-id";
import { confirm } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { OrderStatus } from "@/enums/order-status";
import type {
  CancellableRow,
  LinkedRequestDraft,
  Order,
  OrderDraft,
  OrderPayment,
  OrderSubmitValues,
  PaymentSubmitValues,
} from "@/models/order";
import { useOptimisticRows, type OptimisticOp } from "../use-optimistic-rows";

// The order editor has already split each line at what stock covers, so the
// order's own items fit. values.toMake is the rest, saved as a linked request.
async function submitOrder(values: OrderSubmitValues, existing: Order | null): Promise<string | null> {
  if (values.toMake.length > 0) {
    if (values.items.length === 0) return "Nothing on this order is in stock. Save it as a request instead.";
    if (values.status !== "processing") return "An order with made-to-order items has to stay processing until they're merged in.";
  }
  const deliveryCharge = Math.abs(values.deliveryCharge || 0);
  const advance: OrderPayment | null =
    values.advance && values.advance.amount > 0 ? { id: existing?.advance?.id ?? newId(), ...values.advance } : null;
  // Payments recorded after the advance stay as they are.
  const laterPayments = existing ? existing.amountPaid - (existing.advance?.amount ?? 0) : 0;
  // save_order fills this order first and splits the rest over its linked requests.
  const ownRoom = Math.max(0, orderTotals(values.items, deliveryCharge, 0).totalPrice - laterPayments);
  const toMakeTotal = values.toMake.reduce((sum, item) => sum + item.subTotal, 0);
  const room = roundMoney(ownRoom + toMakeTotal + (existing?.linkedRequests.total ?? 0));
  if (advance && advance.amount > room) {
    return `The advance can't be more than the ${fmtMoney(room)} this order and its requests still owe.`;
  }
  const ownAdvance = advance ? Math.min(advance.amount, ownRoom) : (existing?.advance?.amount ?? 0);
  const amountPaid = roundMoney(laterPayments + ownAdvance);
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
    parentOrderId: values.parentOrderId,
    amountPaid,
    ...orderTotals(values.items, deliveryCharge, amountPaid),
  };
  if (draft.totalPrice < amountPaid) {
    return `The total can't be less than the ${fmtMoney(amountPaid)} paid. Lower the advance, or correct the payments in Transactions.`;
  }
  // toMake rows keep their source row's id, so each gets a fresh one.
  const linkedRequest: LinkedRequestDraft | null =
    values.toMake.length > 0 ? { id: newId(), items: values.toMake.map((item) => ({ ...item, id: newId() })) } : null;
  await saveOrderAction(draft, advance, linkedRequest);
  return null;
}

// Resolves to a message when the order can't be saved; throws if the server save fails.
export function useSubmitOrder() {
  return submitOrder;
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
      const linkedNote = linkedRequestsNote(row.pendingRequestNumbers, "cancelled");
      const kind = row.isRequest ? "request" : "order";
      const confirmed = await confirm({
        title: `Cancel ${kind} ${row.orderNumber}?`,
        description: [paidNote, stockNote, linkedNote, "This can't be undone."].filter(Boolean).join(" "),
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
    async (row: { id: string; orderNumber: string; paymentCount: number; pendingRequestNumbers: string[] }) => {
      const paymentNote =
        row.paymentCount > 0 ? `Its ${row.paymentCount} payment${row.paymentCount === 1 ? "" : "s"} stay in Transactions, unlinked.` : null;
      const note = [paymentNote, linkedRequestsNote(row.pendingRequestNumbers, "deleted")].filter(Boolean).join(" ") || undefined;
      if (!(await confirm({ title: `Delete order ${row.orderNumber}?`, description: note, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteOrderAction(row.id), "Failed to delete order");
    },
    [runOptimistic],
  );

  // The request leaves the Requests tab; its items join the order as made-to-order lines.
  const mergeRequest = useCallback(
    async (row: { id: string; orderNumber: string; parentOrderNumber: string | null }) => {
      if (!row.parentOrderNumber) return;
      const confirmed = await confirm({
        title: `Merge ${row.orderNumber} into ${row.parentOrderNumber}?`,
        description: `Its items join order ${row.parentOrderNumber} as made-to-order lines, and the request is removed. Stock doesn't change.`,
        confirmLabel: "Merge",
      });
      if (!confirmed) return;
      runOptimistic(
        { kind: "hide", id: row.id },
        async () => {
          await mergeRequestAction(row.id);
        },
        "Failed to merge request",
      );
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

  return { visibleRows, cancelOrder, deleteOrder, mergeRequest, advanceOrderStatus };
}

function linkedRequestsNote(numbers: string[], outcome: "cancelled" | "deleted"): string | null {
  if (numbers.length === 0) return null;
  return `Its linked request${numbers.length === 1 ? "" : "s"} ${numbers.join(", ")} will be ${outcome} too.`;
}
