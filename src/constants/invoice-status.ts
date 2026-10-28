import type { InvoiceStatus } from "@/enums/invoice-status";

export const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  Paid: "bg-accent-50 text-accent-700",
  Overdue: "border border-accent-800 text-accent-800",
  Outstanding: "border border-ink/30 text-muted-foreground",
};
