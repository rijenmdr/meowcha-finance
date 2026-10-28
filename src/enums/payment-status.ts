export const PAYMENT_STATUS = {
  paid: "paid",
  partially_paid: "partially_paid",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
