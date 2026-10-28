"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseOrder, parseOrderPayment, parseOrderStatus } from "@/lib/validators/order";
import type { OrderStatus } from "@/enums/order-status";
import type { OrderDraft, OrderPayment } from "@/models/order";

// Returns the order number, which the DB assigns when the order is first saved.
// advance, when given, creates the order's advance payment (an income
// transaction) or updates the one it has; null leaves it as it is.
export async function saveOrderAction(input: OrderDraft, advance: OrderPayment | null): Promise<string> {
  await requireSession();
  const order = parseOrder(input);
  const advancePayment = advance === null ? null : parseOrderPayment(advance);
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
    },
    p_items: order.items.map((item) => ({
      id: item.id,
      variant_id: item.variantId,
      quantity: item.quantity,
      sub_total: item.subTotal,
    })),
    p_payment: advancePayment && paymentRow(advancePayment),
  });
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
  // order_items go with it (on delete cascade).
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
