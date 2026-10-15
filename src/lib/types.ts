export type TxnType = "income" | "expense";

export type DatePreset = "today" | "week" | "month" | "year" | "custom";

export interface DateFilter {
  preset: DatePreset;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TxnType;
  categoryId: string;
  description: string;
  amount: number;
  channelId: string | null;
  sourceId: string | null; // only set on expenses
  customerId: string | null; // only set on income
  orderId: string | null; // set when this income is a payment for an order
}

export interface Category {
  id: string;
  name: string;
  type: TxnType;
}

export interface Channel {
  id: string;
  name: string;
  type: TxnType;
}

// Where the money for an expense came from. Expense-only, so it has no type.
export interface Source {
  id: string;
  name: string;
}

// Who carries an order to the customer.
export interface DeliveryProvider {
  id: string;
  name: string;
}

// How the customer pays for an order.
export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  target: number; // monthly target
}

export interface Invoice {
  id: string;
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}

// One sellable option combination (e.g. Color: Olive, Type: Lined) with its own stock and price.
export interface ProductVariant {
  id: string;
  options: Record<string, string>; // one value per Product.optionNames entry
  quantity: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  optionNames: string[];
  variants: ProductVariant[];
}

export type OrderStatus = "processing" | "ready_for_delivery" | "out_for_delivery" | "delivered";

export type PaymentStatus = "paid" | "partially_paid";

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  subTotal: number; // fixed at order time, not recomputed from the product's price
}

// subTotal, totalPrice and paymentStatus are derived in the DB (see save_order),
// and amountPaid is the sum of the order's payment transactions. The order
// editor previews the totals with orderTotals().
export interface Order {
  id: string;
  orderNumber: string; // assigned by the DB on first save; never edited
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  // False for orders saved before stock tracking began; their items never change stock.
  stockTracked: boolean;
  subTotal: number;
  deliveryCharge: number;
  deliveryLocation: string | null;
  deliveryProviderId: string | null;
  paymentMethodId: string | null;
  totalPrice: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
}

// One payment towards an order, saved as an income transaction linked to it.
export interface OrderPayment {
  id: string; // becomes the transaction's id
  date: string;
  amount: number;
  categoryId: string;
  channelId: string | null;
}

export type DialogKind =
  | "txn"
  | "budget"
  | "invoice"
  | "customer"
  | "category"
  | "channel"
  | "source"
  | "payment"
  | "deliveryProvider"
  | "paymentMethod"
  | null;

export interface TxnFormValues {
  date: string;
  amount: string;
  categoryId: string;
  description: string;
  channelId: string;
}

export interface BudgetFormValues {
  categoryId: string;
  target: string;
}

export interface InvoiceFormValues {
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: string;
  paid: boolean;
}

// The small reference tables the dashboard layout loads once, for dropdowns,
// dialogs and duplicate checks. Everything that grows with use (transactions,
// orders, invoices) is queried per page instead.
export interface Lookups {
  categories: Category[];
  channels: Channel[];
  sources: Source[];
  customers: Customer[];
  deliveryProviders: DeliveryProvider[];
  paymentMethods: PaymentMethod[];
  products: Product[];
  budgets: Budget[];
}

// The order the Record payment dialog adds to. categoryId / channelId come from
// its last payment, so a repeat payment defaults to the same ones.
export interface PaymentTarget {
  orderId: string;
  orderNumber: string;
  totalPrice: number;
  amountPaid: number;
  categoryId: string | null;
  channelId: string | null;
}
