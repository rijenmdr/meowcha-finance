import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface BudgetRow {
  id: string;
  category: string;
  target: number;
  targetDisplay: string;
  actual: number;
  actualDisplay: string;
  pctWidth: string;
  barClass: string;
  over: boolean;
  overAmountDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function BudgetTable({ rows, monthsInRangeLabel }: { rows: BudgetRow[]; monthsInRangeLabel: string }) {
  const { openEditBudget, deleteBudget } = useFinance();
  const columns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        accessorKey: "category",
        header: ({ header }) => <SortableHeader header={header} title="Category" />,
        cell: ({ row }) => row.original.category,
      },
      {
        accessorKey: "target",
        header: ({ header }) => <SortableHeader header={header} title="Target" align="right" />,
        cell: ({ row }) => <span className="text-right text-ink/70">{row.original.targetDisplay}</span>,
      },
      {
        accessorKey: "actual",
        header: ({ header }) => <SortableHeader header={header} title="Actual" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold">{row.original.actualDisplay}</span>,
      },
      {
        id: "progress",
        enableSorting: false,
        header: () => "Progress",
        cell: ({ row }) => (
          <svg className="h-1.5 w-full bg-line-soft">
            <rect width={row.original.pctWidth} height="100%" className={row.original.barClass} />
          </svg>
        ),
      },
      {
        id: "status",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) =>
          row.original.over ? (
            <span className="inline-flex items-center gap-1 border border-accent-800 px-1.75 py-0.5 text-11 text-accent-800">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              Over by {row.original.overAmountDisplay}
            </span>
          ) : null,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditBudget(row.original.id)} />
            <DeleteButton onClick={() => deleteBudget(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteBudget, openEditBudget],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "category", desc: false }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = ["target", "actual", "actions"].includes(header.column.id) ? "text-right" : "text-left";
                return (
                  <th key={header.id} className={cx(thClass, headerClass, header.column.id === "progress" ? "w-45" : "")}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const cellClass = ["target", "actual", "actions"].includes(cell.column.id) ? "text-right" : "";
                return (
                  <td key={cell.id} className={cx(tdClass, cellClass, cell.column.id === "progress" ? "w-45" : "")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination table={table} />
      <div className="px-4 py-2 text-11 text-ink/55">Targets scale to the selected date range ({monthsInRangeLabel}).</div>
    </Panel>
  );
}
