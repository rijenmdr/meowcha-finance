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

interface CustomerRow {
  id: string;
  name: string;
  company: string;
  contact: string;
  inRangeIncome: number;
  inRangeDisplay: string;
  lifetimeIncome: number;
  lifetimeDisplay: string;
  paymentsLabel: string;
  lastDate: string;
  lastDisplay: string;
  orderCount: number;
}

const subLineClass = "mt-0.5 text-11 text-ink/60";

export function CustomersTable({ rows, empty }: { rows: CustomerRow[]; empty: boolean }) {
  const { openEditCustomer, deleteCustomer } = useFinance();
  const visibleRows = useOptimisticRows(rows);
  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Customer" />,
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.name}</div>
            <div className={subLineClass}>{row.original.company}</div>
          </div>
        ),
      },
      {
        accessorKey: "contact",
        header: ({ header }) => <SortableHeader header={header} title="Contact" />,
        cell: ({ row }) => <span className="text-ink/60">{row.original.contact}</span>,
      },
      {
        accessorKey: "lastDate",
        header: ({ header }) => <SortableHeader header={header} title="Last payment" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.lastDisplay}</span>,
      },
      {
        accessorKey: "inRangeIncome",
        header: ({ header }) => <SortableHeader header={header} title="In range" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap text-accent-600">{row.original.inRangeDisplay}</span>,
      },
      {
        accessorKey: "lifetimeIncome",
        header: ({ header }) => <SortableHeader header={header} title="Lifetime" align="right" />,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <div>{row.original.lifetimeDisplay}</div>
            <div className={subLineClass}>{row.original.paymentsLabel}</div>
          </div>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditCustomer(row.original.id)} />
            <DeleteButton onClick={() => deleteCustomer(row.original)} />
          </div>
        ),
      },
    ],
    [deleteCustomer, openEditCustomer],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "lastDate", desc: true }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ inRangeIncome: "text-right", lifetimeIncome: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No customers yet. Add one, then pick them when recording income.</div>}
    </Panel>
  );
}
