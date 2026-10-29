import type { OrderStatus } from "@/enums/order-status";
import type { PaymentStatus } from "@/enums/payment-status";

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  subTotal: number; // fixed at order time, not recomputed from the product's price
}

// An item as the order editor loads it. Lines merged in from a linked request
// are made to order, so they never touch stock.
export interface OrderLine extends OrderItem {
  stockTracked: boolean;
  fromRequestNumber: string | null;
}

// The processing order a linked request belongs to. The request mirrors it:
// everything but the items comes from here. advanceAmount is the whole advance
// taken with the order, which saving the order splits over it and its requests.
export interface ParentOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerId: string;
  customerName: string;
  deliveryCharge: number;
  deliveryLocation: string | null;
  deliveryProviderId: string | null;
  paymentMethodId: string | null;
  note: string | null;
  advanceAmount: number | null;
}

// One page of the parent-order picker's search results.
export interface ParentOrderPage {
  rows: ParentOrder[];
  hasMore: boolean;
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
  items: OrderLine[];
  // False for orders saved before stock tracking began; their items never change stock.
  // Lines merged in from a request don't count.
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
  parentOrder: ParentOrder | null; // set on a linked request
  pendingRequestNumbers: string[]; // this order's open linked requests
  // Their totals and advance shares: the advance field covers them too.
  linkedRequests: { total: number; advance: number };
}

// What the order editor sends to be saved: the DB assigns the number, and the
// advance travels separately. parentOrderId links a new request to its order.
export type OrderDraft = Omit<
  Order,
  "orderNumber" | "stockTracked" | "advance" | "items" | "parentOrder" | "pendingRequestNumbers" | "linkedRequests"
> & {
  items: OrderItem[];
  parentOrderId: string | null;
};

// The shortfall the order editor splits off, saved as a request linked to the order.
export interface LinkedRequestDraft {
  id: string;
  items: OrderItem[];
}

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
  parentOrderId: string | null; // links a new request to a processing order
  toMake: OrderItem[]; // what stock can't cover, saved as a linked request
  // The whole advance: save_order fills the order first and gives the rest to
  // its linked requests. Null leaves the advances as they are; later payments
  // go through submitPayment.
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
  pendingRequestNumbers: string[]; // cancelled along with the order
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
  parentOrderNumber: string | null; // set on a linked request
  pendingRequestNumbers: string[];
  pendingRequestsLabel: string | null; // "1 pending request"
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
