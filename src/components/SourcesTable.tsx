"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance, useOptimisticRows } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";
import { DataTable } from "./DataTable";

interface SourceRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
  inRangeSpend: number;
  inRangeDisplay: string;
}


export function SourcesTable({ rows, empty }: { rows: SourceRow[]; empty: boolean }) {
  const { openEditSource, deleteSource } = useFinance();
  const visibleRows = useOptimisticRows(rows);
  const columns = useMemo<ColumnDef<SourceRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Source" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        accessorKey: "inRangeSpend",
        header: ({ header }) => <SortableHeader header={header} title="Spent in range" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap">{row.original.inRangeDisplay}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditSource(row.original.id)} />
            <DeleteButton onClick={() => deleteSource(row.original)} />
          </div>
        ),
      },
    ],
    [deleteSource, openEditSource],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ inRangeSpend: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No sources yet. Add one, then pick it when recording an expense.</div>}
    </Panel>
  );
}
