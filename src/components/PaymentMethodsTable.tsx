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

interface PaymentMethodRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
  inRangeValue: number;
  inRangeDisplay: string;
}


export function PaymentMethodsTable({ rows, empty }: { rows: PaymentMethodRow[]; empty: boolean }) {
  const { openEditPaymentMethod, deletePaymentMethod } = useFinance();
  const visibleRows = useOptimisticRows(rows);
  const columns = useMemo<ColumnDef<PaymentMethodRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Method" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        accessorKey: "inRangeValue",
        header: ({ header }) => <SortableHeader header={header} title="Order value in range" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap">{row.original.inRangeDisplay}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditPaymentMethod(row.original.id)} />
            <DeleteButton onClick={() => deletePaymentMethod(row.original)} />
          </div>
        ),
      },
    ],
    [deletePaymentMethod, openEditPaymentMethod],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ inRangeValue: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No payment methods yet. Add one, then pick it on an order.</div>}
    </Panel>
  );
}
