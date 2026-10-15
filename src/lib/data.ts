import "server-only";
import { getSupabase } from "./supabase";
import type {
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  Lookups,
  Order,
  PaymentMethod,
  Product,
  Source,
} from "./types";

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

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, name, option_names, product_variants (id, options, quantity, price)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    optionNames: row.option_names,
    variants: (row.product_variants ?? []).map((v: { id: string; options: Record<string, string>; quantity: number; price: number }) => ({
      id: v.id,
      options: v.options,
      quantity: v.quantity,
      price: v.price,
    })),
  }));
}

// One order with its items, for the order editor.
export async function getOrder(id: string): Promise<Order | null> {
  const { data: row, error } = await getSupabase()
    .from("orders")
    .select(
      "id, order_number, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id, total_price, amount_paid, payment_status, order_items (id, variant_id, quantity, sub_total, stock_tracked)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    orderDate: row.order_date,
    status: row.order_status,
    items: (row.order_items ?? []).map((item: { id: string; variant_id: string; quantity: number; sub_total: number }) => ({
      id: item.id,
      variantId: item.variant_id,
      quantity: item.quantity,
      subTotal: item.sub_total,
    })),
    subTotal: row.sub_total,
    stockTracked: (row.order_items ?? []).every((item: { stock_tracked: boolean }) => item.stock_tracked),
    deliveryCharge: row.delivery_charge,
    deliveryLocation: row.delivery_location,
    deliveryProviderId: row.delivery_provider_id,
    paymentMethodId: row.payment_method_id,
    totalPrice: row.total_price,
    amountPaid: row.amount_paid,
    paymentStatus: row.payment_status,
  };
}

// Ids of the product's variants that are on an order, which save_product can't remove.
export async function getVariantIdsInUse(productId: string): Promise<string[]> {
  return rpc<string[]>("variants_in_use", { p_product_id: productId });
}

export async function getLookups(): Promise<Lookups> {
  const [categories, channels, sources, customers, deliveryProviders, paymentMethods, products, budgets] = await Promise.all([
    getCategories(),
    getChannels(),
    getSources(),
    getCustomers(),
    getDeliveryProviders(),
    getPaymentMethods(),
    getProducts(),
    getBudgets(),
  ]);
  return { categories, channels, sources, customers, deliveryProviders, paymentMethods, products, budgets };
}

// Calls one of the reporting functions in schema.sql, which all return jsonb.
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
