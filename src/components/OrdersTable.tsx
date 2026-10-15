"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TableQuery } from "@/lib/table-params";
import type { OrderStatus, PaymentTarget } from "@/lib/types";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance, useOptimisticRows } from "@/lib/finance-context";
import { useServerDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";
import { DataTable } from "./DataTable";

export interface OrderRow {
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
  orderStatus: OrderStatus;
  status: string;
  statusClass: string;
  paymentStatus: string;
  paymentStatusClass: string;
  nextStepLabel: string | null;
  showRecordPayment: boolean;
  paymentCount: number;
  paymentTarget: PaymentTarget;
}

const pillClass = "inline-block px-2 py-0.75 text-11 whitespace-nowrap";
const textButtonClass = "cursor-pointer border-none bg-transparent p-0 font-condensed text-12 font-semibold text-accent-500";

// The rows are one page from the server; sort and page live in the URL.
export function OrdersTable({ rows, total, query }: { rows: OrderRow[]; total: number; query: TableQuery }) {
  const { openEditOrder, deleteOrder, advanceOrderStatus, openRecordPayment } = useFinance();
  const visibleRows = useOptimisticRows(rows);
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
        enableSorting: false,
        header: () => "Items",
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
            <span className={cn(pillClass, row.original.statusClass)}>{row.original.status}</span>
            <span className={cn(pillClass, row.original.paymentStatusClass)}>{row.original.paymentStatus}</span>
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
                  <button type="button" onClick={() => advanceOrderStatus(order)} className={textButtonClass}>
                    {order.nextStepLabel}
                  </button>
                )}
                {order.showRecordPayment && (
                  <button type="button" onClick={() => openRecordPayment(order.paymentTarget)} className={textButtonClass}>
                    Record payment
                  </button>
                )}
              </div>
              <div>
                <EditButton onClick={() => openEditOrder(order.id)} />
                <DeleteButton onClick={() => deleteOrder(order)} />
              </div>
            </div>
          );
        },
      },
    ],
    [advanceOrderStatus, deleteOrder, openEditOrder, openRecordPayment],
  );
  const table = useServerDataTable({ data: visibleRows, columns, rowCount: total, query });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ totalPrice: "text-right", amountPaid: "text-right", actions: "text-right" }} cellClassName="align-top" />
      <TablePagination table={table} />
      {total === 0 && <div className="px-4 py-6 text-13 text-ink/55">No orders in this date range.</div>}
    </Panel>
  );
}
