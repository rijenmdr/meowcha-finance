import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface InvoiceRow {
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
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const { openEditInvoice, deleteInvoice, markInvoicePaid } = useFinance();
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
        cell: ({ row }) => <span className={cx("px-2 py-0.75 text-11", row.original.statusClass)}>{row.original.status}</span>,
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
                onClick={() => markInvoicePaid(row.original.id)}
                className="cursor-pointer border-none bg-transparent py-0 pr-2 pl-0 font-condensed text-12 font-semibold text-accent-500"
              >
                Mark paid
              </button>
            )}
            <EditButton onClick={() => openEditInvoice(row.original.id)} />
            <DeleteButton onClick={() => deleteInvoice(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteInvoice, markInvoicePaid, openEditInvoice],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "issueDate", desc: true }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = ["amount", "actions"].includes(header.column.id) ? "text-right" : "text-left";
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
                const cellClass = ["amount", "actions"].includes(cell.column.id) ? "text-right" : "";
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
    </Panel>
  );
}
