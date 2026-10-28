import type { PaymentStatus } from "@/enums/payment-status";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { paid: "Paid", partially_paid: "Partially paid" };

export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  paid: "bg-accent-50 text-accent-700",
  partially_paid: "border border-accent-800 text-accent-800",
};
