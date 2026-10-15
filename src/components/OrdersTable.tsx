"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableQuery } from "@/lib/table-params";
import type { OrderStatus, PaymentStatus, PaymentTarget } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
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
const filterLabelClass = "text-11 text-ink/60";
const filterInputClass = "h-auto min-h-8.5 w-64 px-2 py-1.25 text-13";
const filterSelectClass = "w-44";

type OrderStatusFilter = "all" | OrderStatus;
type PaymentStatusFilter = "all" | PaymentStatus;
interface OrderFiltersState {
  search: string;
  orderStatus: OrderStatusFilter;
  paymentStatus: PaymentStatusFilter;
}

const DEFAULT_FILTERS: OrderFiltersState = {
  search: "",
  orderStatus: "all",
  paymentStatus: "all",
};

function OrdersFilters({
  initialFilters,
  onApply,
  isNavigating,
}: {
  initialFilters: OrderFiltersState;
  onApply: (next: OrderFiltersState) => void;
  isNavigating: boolean;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedApplyFilters = useDebouncedCallback(onApply, 300);

  useEffect(() => {
    if (!isNavigating) return;
    searchInputRef.current?.focus({ preventScroll: true });
  }, [isNavigating]);

  function updateSearch(nextSearch: string) {
    const next = { ...filters, search: nextSearch };
    setFilters(next);
    debouncedApplyFilters.run(next);
  }

  function updateStatuses(next: { orderStatus: OrderStatusFilter; paymentStatus: PaymentStatusFilter }) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    debouncedApplyFilters.cancel();
    onApply(merged);
  }

  function clearFilters() {
    debouncedApplyFilters.cancel();
    setFilters(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
  }

  const hasActiveFilters = filters.search.trim().length > 0 || filters.orderStatus !== "all" || filters.paymentStatus !== "all";

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="orders-search" className={filterLabelClass}>
          Search orders
        </label>
        <Input
          id="orders-search"
          ref={searchInputRef}
          value={filters.search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Order no, item, customer, phone, status"
          className={filterInputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="order-status-filter" className={filterLabelClass}>
          Order status
        </label>
        <NativeSelect
          id="order-status-filter"
          value={filters.orderStatus}
          onChange={(e) => updateStatuses({ orderStatus: e.target.value as OrderStatusFilter, paymentStatus: filters.paymentStatus })}
          className={filterSelectClass}
        >
          <NativeSelectOption value="all">All order statuses</NativeSelectOption>
          <NativeSelectOption value="processing">Processing</NativeSelectOption>
          <NativeSelectOption value="ready_for_delivery">Ready for delivery</NativeSelectOption>
          <NativeSelectOption value="out_for_delivery">Out for delivery</NativeSelectOption>
          <NativeSelectOption value="delivered">Delivered</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="payment-status-filter" className={filterLabelClass}>
          Payment status
        </label>
        <NativeSelect
          id="payment-status-filter"
          value={filters.paymentStatus}
          onChange={(e) => updateStatuses({ orderStatus: filters.orderStatus, paymentStatus: e.target.value as PaymentStatusFilter })}
          className={filterSelectClass}
        >
          <NativeSelectOption value="all">All payment statuses</NativeSelectOption>
          <NativeSelectOption value="partially_paid">Partially paid</NativeSelectOption>
          <NativeSelectOption value="paid">Paid</NativeSelectOption>
        </NativeSelect>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="min-h-8.5 px-3 text-12">
        Clear filters
      </Button>
    </div>
  );
}

// The rows are one page from the server; sort and page live in the URL.
export function OrdersTable({
  rows,
  total,
  query,
  search,
  filterOrderStatus,
  filterPaymentStatus,
}: {
  rows: OrderRow[];
  total: number;
  query: TableQuery;
  search: string;
  filterOrderStatus: OrderStatusFilter;
  filterPaymentStatus: PaymentStatusFilter;
}) {
  const { setSearch, isNavigating, openEditOrder, deleteOrder, advanceOrderStatus, openRecordPayment } = useFinance();
  const filters: OrderFiltersState = {
    search,
    orderStatus: filterOrderStatus,
    paymentStatus: filterPaymentStatus,
  };
  const visibleRows = useOptimisticRows(rows);

  function applyFilters(next: OrderFiltersState) {
    const normalizedSearch = next.search.trim();
    setSearch({
      q: normalizedSearch ? normalizedSearch : null,
      orderStatus: next.orderStatus === "all" ? null : next.orderStatus,
      paymentStatus: next.paymentStatus === "all" ? null : next.paymentStatus,
      page: null,
    });
  }

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
    <div>
      <OrdersFilters initialFilters={filters} onApply={applyFilters} isNavigating={isNavigating} />

      <Panel>
        <DataTable table={table} columnClasses={{ totalPrice: "text-right", amountPaid: "text-right", actions: "text-right" }} cellClassName="align-top" />
        <TablePagination table={table} />
        {total === 0 && <div className="px-4 py-6 text-13 text-ink/55">No orders match this filter.</div>}
      </Panel>
    </div>
  );
}
