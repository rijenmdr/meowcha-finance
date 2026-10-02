import "server-only";
import { getSupabase } from "./supabase";
import type {
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  Invoice,
  Order,
  PaymentMethod,
  Product,
  Source,
  Transaction,
} from "./types";

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await getSupabase()
    .from("transactions")
    .select("id, date, type, category_id, description, amount, channel_id, source_id, customer_id, order_id")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ category_id, channel_id, source_id, customer_id, order_id, ...row }) => ({
    ...row,
    categoryId: category_id,
    channelId: channel_id,
    sourceId: source_id,
    customerId: customer_id,
    orderId: order_id,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("id, name, type")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChannels(): Promise<Channel[]> {
  const { data, error } = await getSupabase()
    .from("channels")
    .select("id, name, type")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSources(): Promise<Source[]> {
  const { data, error } = await getSupabase()
    .from("sources")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDeliveryProviders(): Promise<DeliveryProvider[]> {
  const { data, error } = await getSupabase()
    .from("delivery_providers")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await getSupabase()
    .from("payment_methods")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("id, name, company, email, phone, notes")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBudgets(): Promise<Budget[]> {
  const { data, error } = await getSupabase().from("budgets").select("id, category_id, target");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, categoryId: row.category_id, target: row.target }));
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("id, customer_id, issue_date, due_date, amount, paid")
    .order("issue_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    amount: row.amount,
    paid: row.paid,
  }));
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, name, color, type, quantity, price")
    .order("name", { ascending: true })
    .order("color", { ascending: true })
    .order("type", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(
      "id, order_number, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_provider_id, payment_method_id, total_price, amount_paid, payment_status, order_items (id, product_id, quantity, sub_total)",
    )
    .order("order_date", { ascending: true })
    .order("order_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    orderDate: row.order_date,
    status: row.order_status,
    items: (row.order_items ?? []).map((item: { id: string; product_id: string; quantity: number; sub_total: number }) => ({
      id: item.id,
      productId: item.product_id,
      quantity: item.quantity,
      subTotal: item.sub_total,
    })),
    subTotal: row.sub_total,
    deliveryCharge: row.delivery_charge,
    deliveryProviderId: row.delivery_provider_id,
    paymentMethodId: row.payment_method_id,
    totalPrice: row.total_price,
    amountPaid: row.amount_paid,
    paymentStatus: row.payment_status,
  }));
}

export async function getDashboardData() {
  const [transactions, budgets, invoices, customers, categories, channels, sources, products, orders, deliveryProviders, paymentMethods] =
    await Promise.all([
      getTransactions(),
      getBudgets(),
      getInvoices(),
      getCustomers(),
      getCategories(),
      getChannels(),
      getSources(),
      getProducts(),
      getOrders(),
      getDeliveryProviders(),
      getPaymentMethods(),
    ]);
  return { transactions, budgets, invoices, customers, categories, channels, sources, products, orders, deliveryProviders, paymentMethods };
}
