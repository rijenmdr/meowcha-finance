"use client";

import { usePathname } from "next/navigation";
import { useFinance } from "@/lib/finance-context";
import { CornerBrackets } from "./CornerBrackets";

const PAGE_TITLES: Record<string, [string, string]> = {
  "/overview": ["Overview", "Income, expenses and cash flow at a glance"],
  "/transactions": ["Transactions", "Every recorded income and expense"],
  "/budget": ["Budget", "Targets vs. actual spend by category"],
  "/invoices": ["Invoices", "Outstanding and paid client invoices"],
  "/customers": ["Customers", "Who you sell to, and the income each brings in"],
  "/categories": ["Categories", "Income and expense categories used across the dashboard"],
  "/channels": ["Channels", "Where income comes from and who expenses are paid to"],
  "/sources": ["Sources", "Where the money for each expense comes from"],
  "/products": ["Products", "Stock and pricing for each color and paper type"],
  "/orders": ["Orders", "Customer orders, delivery progress and payments"],
  "/delivery-providers": ["Delivery providers", "Who carries each order to the customer"],
  "/payment-methods": ["Payment methods", "How customers pay for their orders"],
};

const presetButtonClass =
  "inline-flex cursor-pointer items-center border border-line bg-transparent px-2.5 py-1.5 font-condensed text-13 font-semibold text-ink";

const dateLabelClass = "text-11 text-ink/60";

const dateInputClass = "min-h-8.5 border border-line bg-surface px-2 py-1.25 text-13 text-ink";

export function Header() {
  const pathname = usePathname();
  const { state, setDateStart, setDateEnd, presetMonth, presetQuarter, presetYTD, presetAll, openAddTxn, openAddBudget, openAddInvoice, openAddCustomer, openAddCategory, openAddChannel, openAddSource, openAddProduct, openAddOrder, openAddDeliveryProvider, openAddPaymentMethod } =
    useFinance();

  const [title, subtitle] = PAGE_TITLES[pathname] ?? PAGE_TITLES["/overview"];
  const [addLabel, onAddClick]: [string, () => void] =
    pathname === "/budget"
      ? ["Add budget", openAddBudget]
      : pathname === "/invoices"
        ? ["New invoice", openAddInvoice]
        : pathname === "/customers"
          ? ["Add customer", openAddCustomer]
          : pathname === "/categories"
            ? ["Add category", () => openAddCategory()]
            : pathname === "/channels"
              ? ["Add channel", () => openAddChannel()]
              : pathname === "/sources"
                ? ["Add source", openAddSource]
              : pathname === "/products"
                ? ["Add product", openAddProduct]
              : pathname === "/orders"
                ? ["New order", openAddOrder]
              : pathname === "/delivery-providers"
                ? ["Add provider", openAddDeliveryProvider]
              : pathname === "/payment-methods"
                ? ["Add method", openAddPaymentMethod]
              : ["Add transaction", openAddTxn];

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="mb-1 font-condensed text-32 font-semibold tracking-[-0.015em]">{title}</h1>
        <div className="text-13 text-ink/60">{subtitle}</div>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex gap-1.5">
          <button type="button" onClick={presetMonth} className={presetButtonClass}>
            This month
          </button>
          <button type="button" onClick={presetQuarter} className={presetButtonClass}>
            Last 3 months
          </button>
          <button type="button" onClick={presetYTD} className={presetButtonClass}>
            YTD
          </button>
          <button type="button" onClick={presetAll} className={presetButtonClass}>
            All
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className={dateLabelClass}>From</label>
          <input type="date" value={state.dateStart} onChange={(e) => setDateStart(e.target.value)} className={dateInputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={dateLabelClass}>To</label>
          <input type="date" value={state.dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={dateInputClass} />
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="relative inline-flex cursor-pointer items-center gap-1.5 border border-accent-500 bg-accent-500 px-4 py-2.25 font-condensed text-14 font-semibold text-canvas"
        >
          <CornerBrackets className="text-accent-500/70" />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
