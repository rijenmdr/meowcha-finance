import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface OrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  dateDisplay: string;
  customer: string;
  deliveryLocation: string | null;
  deliveryProvider: string | null;
  paymentMethod: string | null;
  itemsSummary: string;
  unitsLabel: string;
  totalPrice: number;
  totalDisplay: string;
  deliveryCharge: number;
  deliveryDisplay: string | null;
  amountPaid: number;
  paidDisplay: string;
  dueAmount: number;
  dueDisplay: string | null;
  status: string;
  statusClass: string;
  paymentStatus: string;
  paymentStatusClass: string;
  nextStepLabel: string | null;
  showRecordPayment: boolean;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5 align-top";
const pillClass = "inline-block px-2 py-0.75 text-11 whitespace-nowrap";
const textButtonClass = "cursor-pointer border-none bg-transparent p-0 font-condensed text-12 font-semibold text-accent-500";

export function OrdersTable({ rows, empty }: { rows: OrderRow[]; empty: boolean }) {
  const { openEditOrder, deleteOrder, advanceOrderStatus, openRecordPayment } = useFinance();
  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "orderDate",
        header: ({ header }) => <SortableHeader header={header} title="Order" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <div className="font-semibold">{row.original.orderNumber}</div>
            <div className="text-11 text-ink/60">{row.original.dateDisplay}</div>
          </div>
        ),
      },
      {
        accessorKey: "customer",
        header: ({ header }) => <SortableHeader header={header} title="Customer" />,
        cell: ({ row }) => (
          <div>
            <div>{row.original.customer}</div>
            {row.original.deliveryLocation && <div className="text-11 text-ink/60">Deliver to: {row.original.deliveryLocation}</div>}
            {row.original.deliveryProvider && <div className="text-11 text-ink/60">Delivery: {row.original.deliveryProvider}</div>}
            {row.original.paymentMethod && <div className="text-11 text-ink/60">Pays by {row.original.paymentMethod}</div>}
          </div>
        ),
      },
      {
        accessorKey: "itemsSummary",
        header: ({ header }) => <SortableHeader header={header} title="Items" />,
        cell: ({ row }) => (
          <div>
            <div>{row.original.itemsSummary}</div>
            <div className="text-11 text-ink/60">{row.original.unitsLabel}</div>
          </div>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: ({ header }) => <SortableHeader header={header} title="Total" align="right" />,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <div className="font-semibold">{row.original.totalDisplay}</div>
            {row.original.deliveryDisplay && <div className="text-11 text-ink/60">{row.original.deliveryDisplay}</div>}
          </div>
        ),
      },
      {
        accessorKey: "amountPaid",
        header: ({ header }) => <SortableHeader header={header} title="Paid" align="right" />,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <div>{row.original.paidDisplay}</div>
            {row.original.dueDisplay && <div className="text-11 text-accent-800">{row.original.dueDisplay}</div>}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ header }) => <SortableHeader header={header} title="Status" />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <span className={cx(pillClass, row.original.statusClass)}>{row.original.status}</span>
            <span className={cx(pillClass, row.original.paymentStatusClass)}>{row.original.paymentStatus}</span>
          </div>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center justify-end gap-2.5">
              <div className="flex flex-col items-end gap-1">
                {order.nextStepLabel && (
                  <button type="button" onClick={() => advanceOrderStatus(order.id)} className={textButtonClass}>
                    {order.nextStepLabel}
                  </button>
                )}
                {order.showRecordPayment && (
                  <button type="button" onClick={() => openRecordPayment(order.id)} className={textButtonClass}>
                    Record payment
                  </button>
                )}
              </div>
              <div>
                <EditButton onClick={() => openEditOrder(order.id)} />
                <DeleteButton onClick={() => deleteOrder(order.id)} />
              </div>
            </div>
          );
        },
      },
    ],
    [advanceOrderStatus, deleteOrder, openEditOrder, openRecordPayment],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "orderDate", desc: true }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = ["totalPrice", "amountPaid", "actions"].includes(header.column.id) ? "text-right" : "text-left";
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
                const cellClass = ["totalPrice", "amountPaid", "actions"].includes(cell.column.id) ? "text-right" : "";
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No orders in this date range.</div>}
    </Panel>
  );
}
