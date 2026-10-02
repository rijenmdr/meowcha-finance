"use server";

import { auth } from "@/auth";
import { getSupabase } from "./supabase";
import type {
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  Invoice,
  Order,
  OrderPayment,
  PaymentMethod,
  Product,
  Source,
  Transaction,
} from "./types";
import {
  id as parseId,
  parseBudget,
  parseCategory,
  parseChannel,
  parseCustomer,
  parseDeliveryProvider,
  parseInvoice,
  parseOrder,
  parseOrderPayment,
  parsePaymentMethod,
  parseProduct,
  parseSource,
  parseTransaction,
} from "./validate";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

export async function saveTransactionAction(input: Transaction): Promise<void> {
  await requireSession();
  const { categoryId, channelId, sourceId, customerId, orderId, ...row } = parseTransaction(input);
  const { error } = await getSupabase()
    .from("transactions")
    .upsert({
      ...row,
      category_id: categoryId,
      channel_id: channelId,
      source_id: sourceId,
      customer_id: customerId,
      order_id: orderId,
    });
  if (error) throw new Error(error.message);
}

export async function deleteTransactionAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("transactions").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveBudgetAction(input: Budget): Promise<void> {
  await requireSession();
  const budget = parseBudget(input);
  const db = getSupabase();
  // The FK only proves the category exists; budgets are for expenses only.
  const { data: category, error: categoryError } = await db
    .from("categories")
    .select("type")
    .eq("id", budget.categoryId)
    .maybeSingle();
  if (categoryError) throw new Error(categoryError.message);
  if (category?.type !== "expense") throw new Error("Invalid categoryId");

  const { error } = await db.from("budgets").upsert({ id: budget.id, category_id: budget.categoryId, target: budget.target });
  if (error) throw new Error(error.message);
}

export async function deleteBudgetAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("budgets").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveInvoiceAction(input: Invoice): Promise<void> {
  await requireSession();
  const invoice = parseInvoice(input);
  const { error } = await getSupabase()
    .from("invoices")
    .upsert({
      id: invoice.id,
      customer_id: invoice.customerId,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      amount: invoice.amount,
      paid: invoice.paid,
    });
  if (error) throw new Error(error.message);
}

export async function saveCategoryAction(input: Category): Promise<void> {
  await requireSession();
  const category = parseCategory(input);
  const { error } = await getSupabase().from("categories").upsert(category);
  if (error) throw new Error(error.message);
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("categories").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveChannelAction(input: Channel): Promise<void> {
  await requireSession();
  const channel = parseChannel(input);
  const { error } = await getSupabase().from("channels").upsert(channel);
  if (error) throw new Error(error.message);
}

export async function deleteChannelAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("channels").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveSourceAction(input: Source): Promise<void> {
  await requireSession();
  const source = parseSource(input);
  const { error } = await getSupabase().from("sources").upsert(source);
  if (error) throw new Error(error.message);
}

export async function deleteSourceAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("sources").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveDeliveryProviderAction(input: DeliveryProvider): Promise<void> {
  await requireSession();
  const provider = parseDeliveryProvider(input);
  const { error } = await getSupabase().from("delivery_providers").upsert(provider);
  if (error) throw new Error(error.message);
}

export async function deleteDeliveryProviderAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("delivery_providers").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function savePaymentMethodAction(input: PaymentMethod): Promise<void> {
  await requireSession();
  const method = parsePaymentMethod(input);
  const { error } = await getSupabase().from("payment_methods").upsert(method);
  if (error) throw new Error(error.message);
}

export async function deletePaymentMethodAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("payment_methods").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveCustomerAction(input: Customer): Promise<void> {
  await requireSession();
  const customer = parseCustomer(input);
  const { error } = await getSupabase().from("customers").upsert(customer);
  if (error) throw new Error(error.message);
}

export async function deleteCustomerAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("customers").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function saveProductAction(input: Product): Promise<void> {
  await requireSession();
  const product = parseProduct(input);
  const { error } = await getSupabase().from("products").upsert(product);
  if (error) throw new Error(error.message);
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("products").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

export async function deleteInvoiceAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("invoices").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
}

// Returns the order number, which the DB assigns when the order is first saved.
// payment, when given, is recorded as the order's first payment (an income transaction).
export async function saveOrderAction(input: Omit<Order, "orderNumber">, payment: OrderPayment | null): Promise<string> {
  await requireSession();
  const order = parseOrder(input);
  const firstPayment = payment === null ? null : parseOrderPayment(payment);
  // An RPC rather than two upserts, so the order and its items save atomically.
  const { data, error } = await getSupabase().rpc("save_order", {
    p_order: {
      id: order.id,
      customer_id: order.customerId,
      order_date: order.orderDate,
      order_status: order.status,
      delivery_charge: order.deliveryCharge,
      delivery_provider_id: order.deliveryProviderId,
      payment_method_id: order.paymentMethodId,
    },
    p_items: order.items.map((item) => ({
      id: item.id,
      product_id: item.productId,
      quantity: item.quantity,
      sub_total: item.subTotal,
    })),
    p_payment: firstPayment && paymentRow(firstPayment),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function recordOrderPaymentAction(orderId: string, input: OrderPayment): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().rpc("add_order_payment", {
    p_order_id: parseId(orderId, "orderId"),
    p_payment: paymentRow(parseOrderPayment(input)),
  });
  if (error) throw new Error(error.message);
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
}
