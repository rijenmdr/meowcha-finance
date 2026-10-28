// "requested" is a made-to-order request, entered only on create. "cancelled" is final.
export const ORDER_STATUS = {
  requested: "requested",
  processing: "processing",
  ready_for_delivery: "ready_for_delivery",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
