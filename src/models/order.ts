import type { OrderStatus } from "@/enums/order-status";
import type { PaymentStatus } from "@/enums/payment-status";

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  subTotal: number; // fixed at order time, not recomputed from the product's price
}

// One payment towards an order, saved as an income transaction linked to it.
export interface OrderPayment {
  id: string; // becomes the transaction's id
  date: string;
  amount: number;
  categoryId: string;
  channelId: string | null;
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
  requestedDate: string | null; // set when created as a request, kept after conversion
  note: string | null;
  advance: OrderPayment | null; // the one payment the order editor creates and edits
}

// What the order editor sends to be saved: the DB assigns the number, and the
// advance travels separately.
export type OrderDraft = Omit<Order, "orderNumber" | "stockTracked" | "advance">;

export type PaymentSubmitValues = Omit<OrderPayment, "id">;

export interface OrderSubmitValues {
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  deliveryCharge: number;
  deliveryLocation: string | null;
  deliveryProviderId: string | null;
  paymentMethodId: string | null;
  requestedDate: string | null; // only read when a request is first saved
  note: string | null;
  // Creates the order's advance, or updates the one it has. Null leaves it
  // as it is; later payments go through submitPayment.
  advance: PaymentSubmitValues | null;
}

// What cancelling needs from an Orders table row, for the prompt.
export interface CancellableRow {
  id: string;
  orderNumber: string;
  isRequest: boolean;
  amountPaid: number;
  advanceAmount: number | null;
  trackedUnits: number;
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

// One row of the Orders table, formatted on the server by getOrdersPage.
export interface OrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  dateDisplay: string;
  requestedDate: string | null;
  requestedDisplay: string | null;
  note: string | null;
  isRequest: boolean;
  fromRequest: boolean;
  canEdit: boolean;
  canCancel: boolean;
  customer: string;
  deliveryLocation: string | null;
  deliveryProvider: string | null;
  paymentMethod: string | null;
  itemsSummary: string;
  unitsLabel: string;
  totalPrice: number;
  totalDisplay: string;
  deliveryCharge: number;
  deliveryDisplay: string | null;
  amountPaid: number;
  paidDisplay: string;
  dueAmount: number;
  dueDisplay: string | null;
  orderStatus: OrderStatus;
  status: string;
  statusClass: string;
  paymentStatus: string;
  paymentStatusClass: string;
  nextStepLabel: string | null;
  canRecordPayment: boolean;
  paymentCount: number;
  trackedUnits: number;
  advanceAmount: number | null;
  advanceDisplay: string;
  paymentTarget: PaymentTarget;
}
