import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface DeliveryProviderRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
  inRangeCharges: number;
  inRangeDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function DeliveryProvidersTable({ rows, empty }: { rows: DeliveryProviderRow[]; empty: boolean }) {
  const { openEditDeliveryProvider, deleteDeliveryProvider } = useFinance();
  const columns = useMemo<ColumnDef<DeliveryProviderRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Provider" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        accessorKey: "inRangeCharges",
        header: ({ header }) => <SortableHeader header={header} title="Delivery charges in range" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap">{row.original.inRangeDisplay}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditDeliveryProvider(row.original.id)} />
            <DeleteButton onClick={() => deleteDeliveryProvider(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteDeliveryProvider, openEditDeliveryProvider],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = header.column.id === "inRangeCharges" || header.column.id === "actions" ? "text-right" : "text-left";
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
                const cellClass = cell.column.id === "inRangeCharges" || cell.column.id === "actions" ? "text-right" : "";
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No delivery providers yet. Add one, then pick it on an order.</div>}
    </Panel>
  );
}
