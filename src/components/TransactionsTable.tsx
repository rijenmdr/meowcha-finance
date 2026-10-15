"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useMemo, useOptimistic } from "react";
import { useServerDataTable } from "@/lib/use-data-table";
import type { TableQuery } from "@/lib/table-params";
import type { Transaction } from "@/lib/types";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance, useLookups, useOptimisticRows } from "@/lib/finance-context";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";
import { DataTable } from "./DataTable";

export interface TxnRow {
  id: string;
  date: string;
  dateDisplay: string;
  description: string;
  category: string;
  channel: string;
  customerName: string | null;
  sourceName: string | null;
  orderNumber: string | null;
  amount: number;
  amountDisplay: string;
  amountClass: string;
  tagClass: string;
  txn: Transaction;
}

type TypeFilter = "all" | "income" | "expense";

const filterLabelClass = "text-11 text-ink/60";
const selectClass = "min-h-8.5 border border-line bg-surface px-2 py-1.25 text-13";

// The rows are one page from the server. Filters, sort and page live in the
// URL (?type=…&category=…&sort=…&page=…), so changing one reloads the page.
export function TransactionsTable({
  rows,
  total,
  query,
  filterType,
  filterCategory,
  countLabel,
}: {
  rows: TxnRow[];
  total: number;
  query: TableQuery;
  filterType: TypeFilter;
  filterCategory: string;
  countLabel: string;
}) {
  const { setSearch, openEditTxn, deleteTxn } = useFinance();
  const { incomeCategoryOptions: incomeCategories, expenseCategoryOptions: expenseCategories } = useLookups();
  // The selects show the new choice while the filtered page loads.
  const [filters, setOptimisticFilters] = useOptimistic({ type: filterType, category: filterCategory });
  const visibleRows = useOptimisticRows(rows);

  function setFilters(next: { type: TypeFilter; category: string }) {
    setSearch(
      { type: next.type === "all" ? null : next.type, category: next.category === "all" ? null : next.category, page: null },
      () => setOptimisticFilters(next),
    );
  }

  const columns = useMemo<ColumnDef<TxnRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ header }) => <SortableHeader header={header} title="Date" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.dateDisplay}</span>,
      },
      {
        accessorKey: "description",
        header: ({ header }) => <SortableHeader header={header} title="Description" />,
        cell: ({ row }) => {
          const txn = row.original;
          return (
            <>
              {txn.description}
              {txn.customerName && <div className="mt-0.5 text-11 text-accent-600">{txn.customerName}</div>}
              {txn.sourceName && <div className="mt-0.5 text-11 text-ink/60">Paid from {txn.sourceName}</div>}
            </>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ header }) => <SortableHeader header={header} title="Category" />,
        cell: ({ row }) => {
          const txn = row.original;
          return <span className={cn("px-2 py-0.75 text-11", txn.tagClass)}>{txn.category}</span>;
        },
      },
      {
        accessorKey: "channel",
        header: ({ header }) => <SortableHeader header={header} title="Channel" />,
        cell: ({ row }) => <span className="text-ink/60">{row.original.channel}</span>,
      },
      {
        accessorKey: "amount",
        header: ({ header }) => <SortableHeader header={header} title="Amount" align="right" />,
        cell: ({ row }) => {
          const txn = row.original;
          return <span className={cn("text-right font-semibold whitespace-nowrap", txn.amountClass)}>{txn.amountDisplay}</span>;
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => {
          const txn = row.original;
          return (
            <div className="text-right whitespace-nowrap">
              <EditButton onClick={() => openEditTxn(txn.txn)} />
              <DeleteButton onClick={() => deleteTxn(txn)} />
            </div>
          );
        },
      },
    ],
    [deleteTxn, openEditTxn],
  );
  const table = useServerDataTable({ data: visibleRows, columns, rowCount: total, query });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Type</label>
          <select
            value={filters.type}
            // The category list depends on the type, so the selected category may no longer apply.
            onChange={(e) => setFilters({ type: e.target.value as TypeFilter, category: "all" })}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Category</label>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className={selectClass}>
            <option value="all">All categories</option>
            {filters.type !== "expense" && (
              <optgroup label="Income">
                {incomeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            )}
            {filters.type !== "income" && (
              <optgroup label="Expense">
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="ml-auto self-end pb-2 text-12 text-ink/60">{countLabel}</div>
      </div>

      <Panel>
        <DataTable table={table} columnClasses={{ amount: "text-right", actions: "text-right" }} cellClasses={{ date: "whitespace-nowrap text-ink/60" }} />
        <TablePagination table={table} />
        {total === 0 && <div className="px-4 py-6 text-13 text-ink/55">No transactions match these filters.</div>}
      </Panel>
    </div>
  );
}
