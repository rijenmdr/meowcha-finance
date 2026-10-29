import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSubmitOrder } from "@/hooks/mutations/use-order-mutations";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { orderTotals } from "@/lib/helpers/order-totals";
import { roundMoney } from "@/lib/utils/format-money";
import { parseAmount } from "@/lib/utils/parse-amount";
import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { OrderStatus } from "@/enums/order-status";
import type { Order, OrderSubmitValues, ParentOrder, PaymentSubmitValues } from "@/models/order";
import { useOrderItems } from "./use-order-items";

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

// A linked request's fields are disabled (so missing from the form data) and
// mirror its order. save_order copies them from the order again on the server.
function readDetails(formData: FormData, parent: ParentOrder | null) {
  if (parent) {
    return {
      customerId: parent.customerId,
      deliveryLocation: parent.deliveryLocation,
      deliveryProviderId: parent.deliveryProviderId,
      paymentMethodId: parent.paymentMethodId,
      note: parent.note,
    };
  }
  return {
    customerId: String(formData.get("customerId") || ""),
    deliveryLocation: String(formData.get("deliveryLocation") || "").trim() || null,
    deliveryProviderId: String(formData.get("deliveryProviderId") || "") || null,
    paymentMethodId: String(formData.get("paymentMethodId") || "") || null,
    note: String(formData.get("note") || "").trim() || null,
  };
}

// Why the status can't be picked, or null when it can.
function statusLockReason(order: Order | null, hasShortfall: boolean): string | null {
  if (order && order.pendingRequestNumbers.length > 0) {
    return `Waiting on request ${order.pendingRequestNumbers.join(", ")}. Merge or delete it to move this order on.`;
  }
  if (hasShortfall) return "Stays processing while the made-to-order items are pending.";
  return null;
}

// The order editor's state, totals and submit. order is null when new.
export function useOrderForm(mode: OrderEditorMode, order: Order | null) {
  const router = useRouter();
  const submitOrder = useSubmitOrder();

  const isNew = mode === "new" || mode === "new-request";
  const isRequest = mode === "new-request" || mode === "edit-request";
  const readOnly = mode === "view";
  const canPickParent = mode === "new-request";
  const advance = order?.advance ?? null;
  const tracksStock = mode === "new" || (mode === "edit" && !!order?.stockTracked);
  const orderItems = useOrderItems(order, { tracksStock, isRequest });

  // The advance field holds the whole advance, linked requests' shares included.
  const linkedRequests = order?.linkedRequests ?? { total: 0, advance: 0 };
  const initialAdvance = roundMoney((advance?.amount ?? 0) + linkedRequests.advance);

  const [parent, setParent] = useState<ParentOrder | null>(order?.parentOrder ?? null);
  const [deliveryCharge, setDeliveryCharge] = useState(order ? String(order.deliveryCharge) : "0");
  const [advanceAmount, setAdvanceAmount] = useState(String(initialAdvance));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A linked request's order charges the delivery and takes the advance.
  const savedDeliveryCharge = parent ? 0 : parseAmount(deliveryCharge);
  const savedAdvance = parent ? 0 : parseAmount(advanceAmount);
  // Payments recorded after the advance; the editor leaves them alone.
  const laterPayments = order ? roundMoney(order.amountPaid - (advance?.amount ?? 0)) : 0;
  const toMakeTotal = roundMoney(orderItems.toMake.reduce((sum, item) => sum + item.subTotal, 0));
  // The advance covers this order first; the rest goes to its linked requests.
  const ownRoom = Math.max(0, orderTotals(orderItems.orderLines, savedDeliveryCharge, 0).totalPrice - laterPayments);
  const ownAdvance = Math.min(savedAdvance, ownRoom);
  const paidValue = roundMoney(laterPayments + ownAdvance);
  const totals = orderTotals(orderItems.orderLines, savedDeliveryCharge, paidValue);
  const balanceDue = Math.max(0, totals.totalPrice - paidValue);
  const maxAdvance = roundMoney(ownRoom + toMakeTotal + linkedRequests.total);
  // On an order, what goes to its linked requests; on a linked request, its own share.
  const requestsAdvance = parent ? (advance?.amount ?? 0) : roundMoney(savedAdvance - ownAdvance);
  const statusLock = statusLockReason(order, orderItems.toMake.length > 0);

  // Requests go back to their own tab; everything else to the Orders tab.
  function goBack() {
    router.push(withDateFilter("/orders", isRequest ? { tab: "requests" } : {}));
  }

  function readValues(formData: FormData): OrderSubmitValues {
    const { requestedDate, orderDate } = readOrderDates(mode, order, formData);
    return {
      ...readDetails(formData, parent),
      orderDate: parent ? parent.orderDate : orderDate,
      requestedDate: parent ? parent.orderDate : requestedDate,
      // A disabled status select isn't in the form data.
      status: isRequest ? "requested" : ((formData.get("status") as OrderStatus | null) ?? order?.status ?? "processing"),
      items: orderItems.orderLines,
      toMake: orderItems.toMake,
      deliveryCharge: roundMoney(savedDeliveryCharge),
      parentOrderId: canPickParent ? (parent?.id ?? null) : null,
      advance: parent ? null : readAdvance(formData, roundMoney(savedAdvance)),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setPending(true);
    setError(null);
    try {
      const problem = await submitOrder(readValues(new FormData(event.currentTarget)), order);
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
    canPickParent,
    parent,
    setParent,
    statusLock,
    advance,
    orderItems,
    toMakeTotal,
    deliveryCharge,
    setDeliveryCharge,
    advanceAmount,
    setAdvanceAmount,
    maxAdvance,
    requestsAdvance,
    totals,
    paidValue,
    balanceDue,
    pending,
    error,
    goBack,
    handleSubmit,
  };
}
