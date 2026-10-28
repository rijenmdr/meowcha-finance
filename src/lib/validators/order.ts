import "server-only";
import { orderTotals } from "@/lib/helpers/order-totals";
import { roundMoney } from "@/lib/utils/format-money";
import type { OrderStatus } from "@/enums/order-status";
import type { OrderDraft, OrderItem, OrderPayment } from "@/models/order";
import { date, fail, id, num, obj, str } from "./shared";

// What the editor may save. "cancelled" only comes from cancelOrderAction.
const SAVE_ORDER_STATUSES: readonly OrderStatus[] = ["requested", "processing", "ready_for_delivery", "out_for_delivery", "delivered"];

// The table's one-click steps never enter or leave a request, or cancel.
const STEP_ORDER_STATUSES: readonly OrderStatus[] = ["processing", "ready_for_delivery", "out_for_delivery", "delivered"];

export function parseOrderStatus(value: unknown): OrderStatus {
  if (!STEP_ORDER_STATUSES.includes(value as OrderStatus)) fail("status");
  return value as OrderStatus;
}

// Totals and payment status are recomputed rather than trusted, matching what
// the DB derives, so the returned order is exactly what save_order() stores.
// orderNumber is left out: the DB assigns it and ignores any sent value.
export function parseOrder(value: unknown): OrderDraft {
  const v = obj(value, "order");
  if (!SAVE_ORDER_STATUSES.includes(v.status as OrderStatus)) fail("status");
  if (!Array.isArray(v.items) || v.items.length === 0 || v.items.length > 200) fail("items");
  const items = v.items.map((raw): OrderItem => {
    const item = obj(raw, "item");
    const quantity = num(item.quantity, "quantity");
    if (!Number.isInteger(quantity) || quantity < 1) fail("quantity");
    return {
      id: id(item.id),
      variantId: id(item.variantId, "variantId"),
      quantity,
      subTotal: roundMoney(num(item.subTotal, "subTotal")),
    };
  });
  if (new Set(items.map((i) => i.variantId)).size !== items.length) fail("items");
  const deliveryCharge = roundMoney(num(v.deliveryCharge, "deliveryCharge"));
  const amountPaid = roundMoney(num(v.amountPaid, "amountPaid"));
  const totals = orderTotals(items, deliveryCharge, amountPaid);
  if (amountPaid > totals.totalPrice) fail("amountPaid");
  return {
    id: id(v.id),
    customerId: id(v.customerId, "customerId"),
    orderDate: date(v.orderDate, "orderDate"),
    status: v.status as OrderStatus,
    items,
    deliveryCharge,
    deliveryLocation: v.deliveryLocation != null && String(v.deliveryLocation).trim() !== "" ? str(v.deliveryLocation, "deliveryLocation", { max: 500 }) : null,
    deliveryProviderId: v.deliveryProviderId != null && v.deliveryProviderId !== "" ? id(v.deliveryProviderId, "deliveryProviderId") : null,
    paymentMethodId: v.paymentMethodId != null && v.paymentMethodId !== "" ? id(v.paymentMethodId, "paymentMethodId") : null,
    // save_order only stores it on a new request, and never overwrites it.
    requestedDate: v.requestedDate != null && v.requestedDate !== "" ? date(v.requestedDate, "requestedDate") : null,
    note: v.note != null && String(v.note).trim() !== "" ? str(v.note, "note", { max: 2000 }).trim() : null,
    amountPaid,
    ...totals,
  };
}

export function parseOrderPayment(value: unknown): OrderPayment {
  const v = obj(value, "payment");
  const amount = roundMoney(num(v.amount, "amount"));
  if (amount <= 0) fail("amount");
  return {
    id: id(v.id),
    date: date(v.date, "date"),
    amount,
    categoryId: id(v.categoryId, "categoryId"),
    channelId: v.channelId != null && v.channelId !== "" ? id(v.channelId, "channelId") : null,
  };
}
