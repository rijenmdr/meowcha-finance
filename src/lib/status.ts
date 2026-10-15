import type { OrderStatus, PaymentStatus } from "./types";

// Display labels and classes for record statuses. The server uses them to
// build table rows, and the client to patch a row optimistically.

export type InvoiceStatus = "Paid" | "Overdue" | "Outstanding";

export const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  Paid: "bg-accent-50 text-accent-700",
  Overdue: "border border-accent-800 text-accent-800",
  Outstanding: "border border-ink/30 text-muted-foreground",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  processing: "border border-ink/30 text-muted-foreground",
  ready_for_delivery: "bg-mist text-graphite",
  out_for_delivery: "border border-accent-500 text-accent-700",
  delivered: "bg-accent-50 text-accent-700",
};

// The table's one-click step forward, with the button label for that step.
export const NEXT_ORDER_STATUS: Record<OrderStatus, { status: OrderStatus; label: string } | null> = {
  processing: { status: "ready_for_delivery", label: "Mark ready" },
  ready_for_delivery: { status: "out_for_delivery", label: "Send out" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
  delivered: null,
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { paid: "Paid", partially_paid: "Partially paid" };

export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  paid: "bg-accent-50 text-accent-700",
  partially_paid: "border border-accent-800 text-accent-800",
};

// The order status columns a row shows, so an optimistic step can replace them together.
export function orderStatusCells(status: OrderStatus) {
  return {
    orderStatus: status,
    status: ORDER_STATUS_LABELS[status],
    statusClass: ORDER_STATUS_CLASSES[status],
    nextStepLabel: NEXT_ORDER_STATUS[status]?.label ?? null,
  };
}
