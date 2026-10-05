import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

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
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";
const subLineClass = "mt-0.5 text-11 text-ink/60";

export function CustomersTable({ rows, empty }: { rows: CustomerRow[]; empty: boolean }) {
  const { openEditCustomer, deleteCustomer } = useFinance();
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
            <DeleteButton onClick={() => deleteCustomer(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteCustomer, openEditCustomer],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "lastDate", desc: true }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = ["inRangeIncome", "lifetimeIncome", "actions"].includes(header.column.id) ? "text-right" : "text-left";
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
                const cellClass = ["inRangeIncome", "lifetimeIncome", "actions"].includes(cell.column.id) ? "text-right" : "";
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No customers yet. Add one, then pick them when recording income.</div>}
    </Panel>
  );
}
