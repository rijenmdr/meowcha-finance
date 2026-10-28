// The Orders page's tab (?tab=requests). Anything else is the Orders tab.
export const ORDERS_TAB = {
  orders: "orders",
  requests: "requests",
} as const;
export type OrdersTab = (typeof ORDERS_TAB)[keyof typeof ORDERS_TAB];
