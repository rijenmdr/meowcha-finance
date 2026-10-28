import type { DialogKind } from "@/enums/dialog-kind";
import type { TxnType } from "@/enums/txn-type";

// Title and subtitle per top-level section.
export const PAGE_TITLES: Record<string, [string, string]> = {
  "/overview": ["Overview", "Income, expenses and cash flow at a glance"],
  "/transactions": ["Transactions", "Every recorded income and expense"],
  "/budget": ["Budget", "Targets vs. actual spend by category"],
  "/invoices": ["Invoices", "Outstanding and paid client invoices"],
  "/customers": ["Customers", "Who you sell to, and the income each brings in"],
  "/categories": ["Transaction categories", "Income and expense categories used across the dashboard"],
  "/product-categories": ["Product categories", "What kind of product each one is"],
  "/channels": ["Channels", "Where income comes from and who expenses are paid to"],
  "/sources": ["Sources", "Where the money for each expense comes from"],
  "/products": ["Products", "Stock and pricing for each product variant"],
  "/orders": ["Orders", "Customer orders, delivery progress and payments"],
  "/delivery-providers": ["Delivery providers", "Who carries each order to the customer"],
  "/payment-methods": ["Payment methods", "How customers pay for their orders"],
};

// The header's add button opens a dialog, or a form page for products and orders.
export type AddAction =
  | { label: string; dialog: DialogKind; txnFormType?: TxnType }
  | { label: string; href: string; params?: Record<string, string> };

export const PAGE_ADD_ACTIONS: Record<string, AddAction> = {
  "/budget": { label: "Add budget", dialog: "budget" },
  "/invoices": { label: "New invoice", dialog: "invoice" },
  "/customers": { label: "Add customer", dialog: "customer" },
  "/categories": { label: "Add category", dialog: "category", txnFormType: "expense" },
  "/channels": { label: "Add channel", dialog: "channel", txnFormType: "income" },
  "/sources": { label: "Add source", dialog: "source" },
  "/products": { label: "Add product", href: "/products/new" },
  "/product-categories": { label: "Add category", dialog: "productCategory" },
  "/orders": { label: "New order", href: "/orders/new" },
  "/delivery-providers": { label: "Add provider", dialog: "deliveryProvider" },
  "/payment-methods": { label: "Add method", dialog: "paymentMethod" },
};

export const REQUESTS_ADD_ACTION: AddAction = { label: "New request", href: "/orders/new", params: { request: "1" } };

// Overview and Transactions add a transaction.
export const DEFAULT_ADD_ACTION: AddAction = { label: "Add transaction", dialog: "txn", txnFormType: "expense" };
