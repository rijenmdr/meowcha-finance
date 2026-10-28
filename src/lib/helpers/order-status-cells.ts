import { CANCELLABLE_STATUSES, NEXT_ORDER_STATUS, ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from "@/constants/order-status";
import type { OrderStatus } from "@/enums/order-status";

// The order status columns a row shows, so an optimistic step can replace them together.
export function orderStatusCells(status: OrderStatus) {
  return {
    orderStatus: status,
    status: ORDER_STATUS_LABELS[status],
    statusClass: ORDER_STATUS_CLASSES[status],
    nextStepLabel: NEXT_ORDER_STATUS[status]?.label ?? null,
    canCancel: CANCELLABLE_STATUSES.includes(status),
  };
}
