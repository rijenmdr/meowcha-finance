// Derived from paid and the due date, never stored.
export const INVOICE_STATUS = {
  paid: "Paid",
  overdue: "Overdue",
  outstanding: "Outstanding",
} as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];
