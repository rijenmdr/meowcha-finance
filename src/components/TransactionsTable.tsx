import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { cx } from "@/lib/cx";
import { useMemo } from "react";
import { useDataTable } from "@/lib/use-data-table";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface TxnRow {
  id: string;
  date: string;
  dateDisplay: string;
  description: string;
  category: string;
  channel: string;
  customerName: string | null;
  sourceName: string | null;
  amount: number;
  amountDisplay: string;
  amountClass: string;
  tagClass: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const filterLabelClass = "text-11 text-ink/60";
const selectClass = "min-h-8.5 border border-line bg-surface px-2 py-1.25 text-13";
const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";
export function TransactionsTable({
  rows,
  incomeCategories,
  expenseCategories,
  filterType,
  filterCategory,
  countLabel,
  empty,
}: {
  rows: TxnRow[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  filterType: string;
  filterCategory: string;
  countLabel: string;
  empty: boolean;
}) {
  const { setFilterType, setFilterCategory, openEditTxn, deleteTxn } = useFinance();
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
          return <span className={cx("px-2 py-0.75 text-11", txn.tagClass)}>{txn.category}</span>;
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
          return <span className={cx("text-right font-semibold whitespace-nowrap", txn.amountClass)}>{txn.amountDisplay}</span>;
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
              <EditButton onClick={() => openEditTxn(txn.id)} />
              <DeleteButton onClick={() => deleteTxn(txn.id)} />
            </div>
          );
        },
      },
    ],
    [deleteTxn, openEditTxn],
  );
  const table = useDataTable({
    data: rows,
    columns,
    initialSorting: [{ id: "date", desc: true }],
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "all" | "income" | "expense")}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="all">All categories</option>
            {filterType !== "expense" && (
              <optgroup label="Income">
                {incomeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            )}
            {filterType !== "income" && (
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
        <table className="w-full text-13">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const headerClass = header.column.id === "amount" || header.column.id === "actions" ? "text-right" : "text-left";
                  return (
                    <th key={header.id} className={cx(thClass, headerClass)}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const cellClass = cell.column.id === "date"
                    ? "whitespace-nowrap text-ink/60"
                    : cell.column.id === "amount" || cell.column.id === "actions"
                      ? "text-right"
                      : "";
                  return (
                    <td key={cell.id} className={cx(tdClass, cellClass)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination table={table} />
        {empty && <div className="px-4 py-6 text-13 text-ink/55">No transactions match these filters.</div>}
      </Panel>
    </div>
  );
}
