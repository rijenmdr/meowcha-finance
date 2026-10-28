import type { OrderStatus } from "@/enums/order-status";

// Display labels and classes for order statuses. The server uses them to
// build table rows, and the client to patch a row optimistically.

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  requested: "Requested",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  requested: "bg-accent-200 text-accent-800",
  processing: "border border-ink/30 text-muted-foreground",
  ready_for_delivery: "bg-mist text-graphite",
  out_for_delivery: "border border-accent-500 text-accent-700",
  delivered: "bg-accent-50 text-accent-700",
  cancelled: "border border-line text-ink/60 line-through",
};

// The table's one-click step forward, with the button label for that step. A
// request is converted through the editor instead, and a cancelled order is final.
export const NEXT_ORDER_STATUS: Record<OrderStatus, { status: OrderStatus; label: string } | null> = {
  requested: null,
  processing: { status: "ready_for_delivery", label: "Mark ready" },
  ready_for_delivery: { status: "out_for_delivery", label: "Send out" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
  delivered: null,
  cancelled: null,
};

// Statuses an order can be cancelled from. cancel_order and guard_order_status
// in schema.sql use the same list.
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["requested", "processing", "ready_for_delivery"];
