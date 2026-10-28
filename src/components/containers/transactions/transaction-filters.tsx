"use client";

import { useLookups } from "@/hooks/use-lookups";
import type { TxnType } from "@/enums/txn-type";

export interface TxnFilters {
  type: "all" | TxnType;
  category: string;
}

const filterLabelClass = "text-11 text-ink/60";
const selectClass = "min-h-8.5 border border-line bg-surface px-2 py-1.25 text-13";

export function TransactionFilters({
  filters,
  onChange,
  countLabel,
}: {
  filters: TxnFilters;
  onChange: (next: TxnFilters) => void;
  countLabel: string;
}) {
  const { incomeCategoryOptions, expenseCategoryOptions } = useLookups();

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label className={filterLabelClass}>Type</label>
        <select
          value={filters.type}
          // The category list depends on the type, so the selected category may no longer apply.
          onChange={(e) => onChange({ type: e.target.value as TxnFilters["type"], category: "all" })}
          className={selectClass}
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className={filterLabelClass}>Category</label>
        <select value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })} className={selectClass}>
          <option value="all">All categories</option>
          {filters.type !== "expense" && (
            <optgroup label="Income">
              {incomeCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </optgroup>
          )}
          {filters.type !== "income" && (
            <optgroup label="Expense">
              {expenseCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div className="ml-auto self-end pb-2 text-12 text-ink/60">{countLabel}</div>
    </div>
  );
}
