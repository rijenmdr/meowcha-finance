"use client";

import { useId } from "react";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useFinance } from "@/lib/finance-context";
import type { DatePreset } from "@/lib/types";
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
  "/products": ["Products", "Stock and pricing for each product variant"],
  "/orders": ["Orders", "Customer orders, delivery progress and payments"],
  "/delivery-providers": ["Delivery providers", "Who carries each order to the customer"],
  "/payment-methods": ["Payment methods", "How customers pay for their orders"],
};

const DATE_PRESETS: [DatePreset, string][] = [
  ["today", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["year", "This year"],
  ["custom", "Custom"],
];

const dateLabelClass = "text-11 text-ink/60";

const dateInputClass = "h-auto min-h-8.5 w-auto px-2 py-1.25 text-13";

export function Header() {
  const pathname = usePathname();
  const fromId = useId();
  const toId = useId();
  const periodId = useId();
  const { dateFilter, setDateStart, setDateEnd, setDatePreset, openAddTxn, openAddBudget, openAddInvoice, openAddCustomer, openAddCategory, openAddChannel, openAddSource, openAddProduct, openAddOrder, openAddDeliveryProvider, openAddPaymentMethod } =
    useFinance();

  const section = "/" + pathname.split("/")[1];
  const [title, subtitle] = PAGE_TITLES[section] ?? PAGE_TITLES["/overview"];
  const [addLabel, onAddClick]: [string, () => void] =
    section === "/budget"
      ? ["Add budget", openAddBudget]
      : section === "/invoices"
        ? ["New invoice", openAddInvoice]
        : section === "/customers"
          ? ["Add customer", openAddCustomer]
          : section === "/categories"
            ? ["Add category", () => openAddCategory()]
            : section === "/channels"
              ? ["Add channel", () => openAddChannel()]
              : section === "/sources"
                ? ["Add source", openAddSource]
              : section === "/products"
                ? ["Add product", openAddProduct]
              : section === "/orders"
                ? ["New order", openAddOrder]
              : section === "/delivery-providers"
                ? ["Add provider", openAddDeliveryProvider]
              : section === "/payment-methods"
                ? ["Add method", openAddPaymentMethod]
              : ["Add transaction", openAddTxn];

  // The product and order form pages have their own title and buttons.
  if (pathname.startsWith("/products/") || pathname.startsWith("/orders/")) return null;

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="mb-1 font-condensed text-32 font-semibold tracking-[-0.015em]">{title}</h1>
        <div className="text-13 text-ink/60">{subtitle}</div>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <Label htmlFor={periodId} className={dateLabelClass}>
            Period
          </Label>
          <NativeSelect id={periodId} value={dateFilter.preset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className="w-36">
            {DATE_PRESETS.map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {dateFilter.preset === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor={fromId} className={dateLabelClass}>
                From
              </Label>
              <Input id={fromId} type="date" value={dateFilter.start} max={dateFilter.end} onChange={(e) => setDateStart(e.target.value)} className={dateInputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={toId} className={dateLabelClass}>
                To
              </Label>
              <Input id={toId} type="date" value={dateFilter.end} min={dateFilter.start} onChange={(e) => setDateEnd(e.target.value)} className={dateInputClass} />
            </div>
          </>
        )}
        <Button onClick={onAddClick} className="relative h-auto gap-1.5 py-2.25">
          <CornerBrackets className="text-accent-500/70" />
          <PlusIcon aria-hidden strokeWidth={1.5} className="size-3.25" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
