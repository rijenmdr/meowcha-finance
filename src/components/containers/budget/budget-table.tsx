"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "@/components/shared/panel";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { useDialogStore } from "@/stores/use-dialog-store";
import { useBudgetRows } from "@/hooks/mutations/use-budget-mutations";
import { useDataTable } from "@/hooks/use-data-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { DataTable } from "@/components/shared/data-table";

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


export function BudgetTable({ rows, monthsInRangeLabel }: { rows: BudgetRow[]; monthsInRangeLabel: string }) {
  const openDialog = useDialogStore((state) => state.open);
  const { visibleRows, deleteBudget } = useBudgetRows(rows);
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
            <EditButton onClick={() => openDialog("budget", { editId: row.original.id })} />
            <DeleteButton onClick={() => deleteBudget(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteBudget, openDialog],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "category", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ target: "text-right", actual: "text-right", actions: "text-right", progress: "w-45" }} />
      <TablePagination table={table} />
      <div className="px-4 py-2 text-11 text-ink/55">Targets scale to the selected date range ({monthsInRangeLabel}).</div>
    </Panel>
  );
}
