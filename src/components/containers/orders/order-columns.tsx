import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { cn } from "@/lib/utils/cn";
import type { OrdersTab } from "@/enums/orders-tab";
import type { CancellableRow, OrderRow, PaymentTarget } from "@/models/order";
import { OrderRowActions } from "./order-row-actions";
import { RequestRowActions } from "./request-row-actions";

export interface OrderRowHandlers {
  openEditOrder: (id: string) => void;
  openConvertRequest: (id: string) => void;
  openRecordPayment: (target: PaymentTarget) => void;
  advanceOrderStatus: (row: OrderRow) => void;
  cancelOrder: (row: CancellableRow) => void;
  deleteOrder: (row: OrderRow) => void;
}

const pillClass = "inline-block px-2 py-0.75 text-11 whitespace-nowrap";
const subTextClass = "text-11 text-ink/60";

const customerColumn: ColumnDef<OrderRow> = {
  accessorKey: "customer",
  header: ({ header }) => <SortableHeader header={header} title="Customer" />,
  cell: ({ row }) => (
    <div>
      <div>{row.original.customer}</div>
      {row.original.deliveryLocation && <div className={subTextClass}>Deliver to: {row.original.deliveryLocation}</div>}
      {row.original.deliveryProvider && <div className={subTextClass}>Delivery: {row.original.deliveryProvider}</div>}
      {row.original.paymentMethod && <div className={subTextClass}>Pays by {row.original.paymentMethod}</div>}
      {row.original.note && <div className={cn(subTextClass, "line-clamp-2 italic")}>Note: {row.original.note}</div>}
    </div>
  ),
};

const itemsColumn: ColumnDef<OrderRow> = {
  accessorKey: "itemsSummary",
  enableSorting: false,
  header: () => "Items",
  cell: ({ row }) => (
    <div>
      <div>{row.original.itemsSummary}</div>
      <div className={subTextClass}>{row.original.unitsLabel}</div>
    </div>
  ),
};

const totalColumn: ColumnDef<OrderRow> = {
  accessorKey: "totalPrice",
  header: ({ header }) => <SortableHeader header={header} title="Total" align="right" />,
  cell: ({ row }) => (
    <div className="text-right whitespace-nowrap">
      <div className="font-semibold">{row.original.totalDisplay}</div>
      {row.original.deliveryDisplay && <div className={subTextClass}>{row.original.deliveryDisplay}</div>}
    </div>
  ),
};

function paidColumn(title: string): ColumnDef<OrderRow> {
  return {
    accessorKey: "amountPaid",
    header: ({ header }) => <SortableHeader header={header} title={title} align="right" />,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        <div>{row.original.paidDisplay}</div>
        {row.original.dueDisplay && <div className="text-11 text-accent-800">{row.original.dueDisplay}</div>}
      </div>
    ),
  };
}

function requestColumns(handlers: OrderRowHandlers): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: "requestedDate",
      header: ({ header }) => <SortableHeader header={header} title="Requested" />,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1 whitespace-nowrap">
          <div className="font-semibold">{row.original.orderNumber}</div>
          <div className={subTextClass}>{row.original.requestedDisplay}</div>
          <span className={cn(pillClass, row.original.statusClass)}>{row.original.status}</span>
        </div>
      ),
    },
    customerColumn,
    itemsColumn,
    totalColumn,
    paidColumn("Advance"),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => <RequestRowActions request={row.original} handlers={handlers} />,
    },
  ];
}

function orderColumns(handlers: OrderRowHandlers): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: "orderDate",
      header: ({ header }) => <SortableHeader header={header} title="Order" />,
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <div className="font-semibold">{row.original.orderNumber}</div>
          <div className={subTextClass}>{row.original.dateDisplay}</div>
          {row.original.fromRequest && <div className="text-11 text-accent-600">From request · {row.original.requestedDisplay}</div>}
        </div>
      ),
    },
    customerColumn,
    itemsColumn,
    totalColumn,
    paidColumn("Paid"),
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
      cell: ({ row }) => <OrderRowActions order={row.original} handlers={handlers} />,
    },
  ];
}

// Each tab has its own columns; they share customer, items and total.
export function buildOrderColumns(tab: OrdersTab, handlers: OrderRowHandlers): ColumnDef<OrderRow>[] {
  if (tab === "requests") return requestColumns(handlers);
  return orderColumns(handlers);
}
