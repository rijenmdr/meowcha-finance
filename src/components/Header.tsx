"use client";

import { usePathname } from "next/navigation";
import { useFinance } from "@/lib/finance-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "lucide-react";

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

const presetButtonClass = "rounded-none border-line bg-transparent font-condensed text-13 font-semibold text-ink hover:bg-surface";

const dateLabelClass = "text-11 text-ink/60";

const dateInputClass = "h-8.5 rounded-none border-line bg-surface text-13 text-ink";

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
          <Button type="button" variant="outline" size="sm" onClick={presetMonth} className={presetButtonClass}>
            This month
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={presetQuarter} className={presetButtonClass}>
            Last 3 months
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={presetYTD} className={presetButtonClass}>
            YTD
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={presetAll} className={presetButtonClass}>
            All
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <label className={dateLabelClass}>From</label>
          <Input type="date" value={state.dateStart} onChange={(e) => setDateStart(e.target.value)} className={dateInputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={dateLabelClass}>To</label>
          <Input type="date" value={state.dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={dateInputClass} />
        </div>
        <Button
          type="button"
          onClick={onAddClick}
          className="rounded-none border-accent-500 bg-accent-500 font-condensed text-14 font-semibold text-canvas hover:bg-accent-600"
        >
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
