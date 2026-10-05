import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface CategoryRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
  budgeted: boolean;
}

const tdClass = "border-b border-line-soft px-4 py-2.5";

export function CategoriesTable({ type, rows }: { type: TxnType; rows: CategoryRow[] }) {
  const { openAddCategory, openEditCategory, deleteCategory } = useFinance();
  const title = type === "income" ? "Income" : "Expense";
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Category" />,
        cell: ({ row }) => (
          <>
            {row.original.name}
            {row.original.budgeted && <span className="ml-2 bg-accent-50 px-1.5 py-0.5 text-10 text-accent-700">Budgeted</span>}
          </>
        ),
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" align="right" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditCategory(row.original.id)} />
            <DeleteButton onClick={() => deleteCategory(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteCategory, openEditCategory],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div className="font-condensed text-17 font-semibold">{title} categories</div>
        <button
          type="button"
          onClick={() => openAddCategory(type)}
          className="cursor-pointer border-none bg-transparent p-0 font-condensed text-13 font-semibold text-accent-500"
        >
          + Add
        </button>
      </div>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = header.column.id === "usageCount" || header.column.id === "actions" ? "text-right" : "text-left";
                return (
                  <th key={header.id} className={cx("border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase", headerClass)}>
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
                const cellClass = cell.column.id === "usageCount" || cell.column.id === "actions" ? "text-right" : "";
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
      {rows.length === 0 && <div className="px-4 py-6 text-13 text-ink/55">No {type} categories yet.</div>}
    </Panel>
  );
}
