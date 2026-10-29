"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { searchParentOrders } from "@/lib/queries/order";
import { parseLinkedRequest, parseOrder, parseOrderPayment, parseOrderStatus, parseParentOrderSearch } from "@/lib/validators/order";
import type { OrderStatus } from "@/enums/order-status";
import type { LinkedRequestDraft, OrderDraft, OrderItem, OrderPayment, ParentOrderPage } from "@/models/order";

function itemRows(items: OrderItem[]) {
  return items.map((item) => ({
    id: item.id,
    variant_id: item.variantId,
    quantity: item.quantity,
    sub_total: item.subTotal,
  }));
}

// Returns the order number, which the DB assigns when the order is first saved.
// advance, when given, creates the order's advance payment (an income
// transaction) or updates the one it has; null leaves it as it is.
// linkedRequest, when given, is the shortfall stock can't cover, saved in the
// same transaction as a request linked to this order.
export async function saveOrderAction(
  input: OrderDraft,
  advance: OrderPayment | null,
  linkedRequest: LinkedRequestDraft | null = null,
): Promise<string> {
  await requireSession();
  const order = parseOrder(input);
  const advancePayment = advance === null ? null : parseOrderPayment(advance);
  const request = linkedRequest === null ? null : parseLinkedRequest(linkedRequest);
  // An RPC rather than two upserts, so the order and its items save atomically.
  const { data, error } = await getSupabase().rpc("save_order", {
    p_order: {
      id: order.id,
      customer_id: order.customerId,
      order_date: order.orderDate,
      order_status: order.status,
      delivery_charge: order.deliveryCharge,
      delivery_location: order.deliveryLocation,
      delivery_provider_id: order.deliveryProviderId,
      payment_method_id: order.paymentMethodId,
      requested_date: order.requestedDate,
      note: order.note,
      parent_order_id: order.parentOrderId,
    },
    p_items: itemRows(order.items),
    p_payment: advancePayment && paymentRow(advancePayment),
    p_request: request && { id: request.id, items: itemRows(request.items) },
  });
  if (error) throw new Error(error.message);
  refresh();
  return data as string;
}

// The request editor's parent-order picker searches as you type, so it reads
// through an action rather than a server render. Nothing changes, so no refresh().
export async function searchParentOrdersAction(search: string, page: number): Promise<ParentOrderPage> {
  await requireSession();
  const input = parseParentOrderSearch(search, page);
  return searchParentOrders(input.search, input.page);
}

// Moves a linked request's items into its order and deletes the request, in
// one transaction. Returns the order's number.
export async function mergeRequestAction(id: string): Promise<string> {
  await requireSession();
  const { data, error } = await getSupabase().rpc("merge_request", { p_id: parseId(id) });
  if (error) throw new Error(error.message);
  refresh();
  return data as string;
}

export async function recordOrderPaymentAction(orderId: string, input: OrderPayment): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().rpc("add_order_payment", {
    p_order_id: parseId(orderId, "orderId"),
    p_payment: paymentRow(parseOrderPayment(input)),
  });
  if (error) throw new Error(error.message);
  refresh();
}

function paymentRow(payment: OrderPayment) {
  return {
    id: payment.id,
    date: payment.date,
    amount: payment.amount,
    category_id: payment.categoryId,
    channel_id: payment.channelId,
  };
}

export async function deleteOrderAction(id: string): Promise<void> {
  await requireSession();
  // order_items and linked requests go with it (on delete cascade).
  const { error } = await getSupabase().from("orders").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}

// Puts tracked items back in stock and marks the order cancelled, in one
// transaction. Its payments stay linked as income.
export async function cancelOrderAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().rpc("cancel_order", { p_id: parseId(id) });
  if (error) throw new Error(error.message);
  refresh();
}

// The Orders table's one-click status step. Only the status changes, so the
// items (and the stock they hold) are left alone. parseOrderStatus rejects
// requested and cancelled, which only the editor and cancelOrderAction set.
export async function setOrderStatusAction(id: string, status: OrderStatus): Promise<void> {
  await requireSession();
  const { error } = await getSupabase()
    .from("orders")
    .update({ order_status: parseOrderStatus(status) })
    .eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
