import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSubmitOrder } from "@/hooks/mutations/use-order-mutations";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { orderTotals } from "@/lib/helpers/order-totals";
import { roundMoney } from "@/lib/utils/format-money";
import { parseAmount } from "@/lib/utils/parse-amount";
import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { OrderStatus } from "@/enums/order-status";
import type { Order, PaymentSubmitValues } from "@/models/order";
import { useOrderItems, type ItemDraft } from "./use-order-items";

// A request's order date is its request date until it's converted.
function readOrderDates(mode: OrderEditorMode, order: Order | null, formData: FormData) {
  if (mode === "new-request") {
    const requestedDate = String(formData.get("requestedDate") || "");
    return { requestedDate, orderDate: requestedDate };
  }
  const requestedDate = order?.requestedDate ?? null;
  if (mode === "edit-request") return { requestedDate, orderDate: order?.orderDate ?? "" };
  return { requestedDate, orderDate: String(formData.get("orderDate") || "") };
}

function readAdvance(formData: FormData, amount: number): PaymentSubmitValues | null {
  if (amount <= 0) return null;
  return {
    date: String(formData.get("advanceDate") || ""),
    amount,
    categoryId: String(formData.get("advanceCategoryId") || ""),
    channelId: String(formData.get("advanceChannelId") || "") || null,
  };
}

function toOrderItems(items: ItemDraft[]) {
  return items.map((item) => ({
    id: item.id,
    variantId: item.productId,
    quantity: parseInt(item.quantity, 10) || 0,
    subTotal: roundMoney(parseAmount(item.subTotal)),
  }));
}

// The order editor's state, totals and submit. order is null when new.
export function useOrderForm(mode: OrderEditorMode, order: Order | null) {
  const router = useRouter();
  const submitOrder = useSubmitOrder();

  const isNew = mode === "new" || mode === "new-request";
  const isRequest = mode === "new-request" || mode === "edit-request";
  const readOnly = mode === "view";
  const advance = order?.advance ?? null;
  const tracksStock = mode === "new" || (mode === "edit" && !!order?.stockTracked);
  const orderItems = useOrderItems(order, { tracksStock, isRequest });

  const [deliveryCharge, setDeliveryCharge] = useState(order ? String(order.deliveryCharge) : "0");
  const [advanceAmount, setAdvanceAmount] = useState(advance ? String(advance.amount) : "0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payments recorded after the advance; the editor leaves them alone.
  const laterPayments = order ? roundMoney(order.amountPaid - (advance?.amount ?? 0)) : 0;
  const paidValue = laterPayments + parseAmount(advanceAmount);
  const totals = orderTotals(
    orderItems.items.map((item) => ({ subTotal: parseAmount(item.subTotal) })),
    parseAmount(deliveryCharge),
    paidValue,
  );
  const balanceDue = Math.max(0, totals.totalPrice - paidValue);
  const maxAdvance = Math.max(0, roundMoney(totals.totalPrice - laterPayments));

  // Requests go back to their own tab; everything else to the Orders tab.
  function goBack() {
    router.push(withDateFilter("/orders", isRequest ? { tab: "requests" } : {}));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const { requestedDate, orderDate } = readOrderDates(mode, order, formData);
    try {
      const problem = await submitOrder(
        {
          customerId: String(formData.get("customerId") || ""),
          orderDate,
          status: isRequest ? "requested" : (String(formData.get("status")) as OrderStatus),
          items: toOrderItems(orderItems.items),
          deliveryCharge: roundMoney(parseAmount(deliveryCharge)),
          deliveryLocation: String(formData.get("deliveryLocation") || "").trim() || null,
          deliveryProviderId: String(formData.get("deliveryProviderId") || "") || null,
          paymentMethodId: String(formData.get("paymentMethodId") || "") || null,
          requestedDate,
          note: String(formData.get("note") || "").trim() || null,
          advance: readAdvance(formData, roundMoney(parseAmount(advanceAmount))),
        },
        order,
      );
      if (problem) {
        setError(problem);
        setPending(false);
        return;
      }
      goBack();
    } catch (err) {
      console.error("Failed to save order", err);
      setError(`Couldn't save the ${isRequest ? "request" : "order"}. Check the details and try again.`);
      setPending(false);
    }
  }

  return {
    isNew,
    isRequest,
    readOnly,
    tracksStock,
    advance,
    orderItems,
    deliveryCharge,
    setDeliveryCharge,
    advanceAmount,
    setAdvanceAmount,
    maxAdvance,
    totals,
    paidValue,
    balanceDue,
    pending,
    error,
    goBack,
    handleSubmit,
  };
}
