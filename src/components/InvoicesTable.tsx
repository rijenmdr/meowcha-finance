"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TableQuery } from "@/lib/table-params";
import type { Invoice } from "@/lib/types";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance, useOptimisticRows } from "@/lib/finance-context";
import { useServerDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";
import { DataTable } from "./DataTable";

export interface InvoiceRow {
  id: string;
  client: string;
  issueDate: string;
  issueDisplay: string;
  dueDate: string;
  dueDisplay: string;
  amount: number;
  amountDisplay: string;
  status: string;
  statusClass: string;
  showMarkPaid: boolean;
  invoice: Invoice;
}

// The rows are one page from the server; sort and page live in the URL.
export function InvoicesTable({ rows, total, query }: { rows: InvoiceRow[]; total: number; query: TableQuery }) {
  const { openEditInvoice, deleteInvoice, markInvoicePaid } = useFinance();
  const visibleRows = useOptimisticRows(rows);
  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "client",
        header: ({ header }) => <SortableHeader header={header} title="Client" />,
        cell: ({ row }) => row.original.client,
      },
      {
        accessorKey: "issueDate",
        header: ({ header }) => <SortableHeader header={header} title="Issued" />,
        cell: ({ row }) => <span className="text-ink/60">{row.original.issueDisplay}</span>,
      },
      {
        accessorKey: "dueDate",
        header: ({ header }) => <SortableHeader header={header} title="Due" />,
        cell: ({ row }) => <span className="text-ink/60">{row.original.dueDisplay}</span>,
      },
      {
        accessorKey: "amount",
        header: ({ header }) => <SortableHeader header={header} title="Amount" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold">{row.original.amountDisplay}</span>,
      },
      {
        accessorKey: "status",
        header: ({ header }) => <SortableHeader header={header} title="Status" />,
        cell: ({ row }) => <span className={cn("px-2 py-0.75 text-11", row.original.statusClass)}>{row.original.status}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            {row.original.showMarkPaid && (
              <button
                type="button"
                onClick={() => markInvoicePaid(row.original.invoice)}
                className="cursor-pointer border-none bg-transparent py-0 pr-2 pl-0 font-condensed text-12 font-semibold text-accent-500"
              >
                Mark paid
              </button>
            )}
            <EditButton onClick={() => openEditInvoice(row.original.invoice)} />
            <DeleteButton onClick={() => deleteInvoice(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteInvoice, markInvoicePaid, openEditInvoice],
  );
  const table = useServerDataTable({ data: visibleRows, columns, rowCount: total, query });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ amount: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
    </Panel>
  );
}
