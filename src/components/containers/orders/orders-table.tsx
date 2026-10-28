"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { Panel } from "@/components/shared/panel";
import { TablePagination } from "@/components/shared/table-pagination";
import { useOrderRows } from "@/hooks/mutations/use-order-mutations";
import { useServerDataTable } from "@/hooks/use-data-table";
import { useUrlSearch } from "@/hooks/use-url-search";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { useDialogStore } from "@/stores/use-dialog-store";
import { useNavigationStore } from "@/stores/use-navigation-store";
import type { OrdersTab } from "@/enums/orders-tab";
import type { TableQuery } from "@/lib/helpers/table-params";
import type { OrderRow, PaymentTarget } from "@/models/order";
import { buildOrderColumns } from "./order-columns";
import { OrdersFilters, type OrderFiltersState } from "./orders-filters";

// The rows are one page from the server; sort and page live in the URL.
export function OrdersTable({
  tab,
  rows,
  total,
  query,
  filters,
}: {
  tab: OrdersTab;
  rows: OrderRow[];
  total: number;
  query: TableQuery;
  filters: OrderFiltersState;
}) {
  const router = useRouter();
  const { setSearch } = useUrlSearch();
  const isNavigating = useNavigationStore((state) => state.pendingCount > 0);
  const openDialog = useDialogStore((state) => state.open);
  const { visibleRows, cancelOrder, deleteOrder, advanceOrderStatus } = useOrderRows(rows);

  // The editor page picks request, order or read-only mode from the order's status.
  const openEditOrder = useCallback((id: string) => router.push(withDateFilter(`/orders/${id}`)), [router]);
  const openConvertRequest = useCallback((id: string) => router.push(withDateFilter(`/orders/${id}`, { convert: "1" })), [router]);
  const openRecordPayment = useCallback(
    (target: PaymentTarget) => openDialog("payment", { editId: target.orderId, paymentTarget: target }),
    [openDialog],
  );

  const columns = useMemo(
    () => buildOrderColumns(tab, { openEditOrder, openConvertRequest, openRecordPayment, advanceOrderStatus, cancelOrder, deleteOrder }),
    [tab, advanceOrderStatus, cancelOrder, deleteOrder, openConvertRequest, openEditOrder, openRecordPayment],
  );
  const table = useServerDataTable({ data: visibleRows, columns, rowCount: total, query });

  function applyFilters(next: OrderFiltersState) {
    const normalizedSearch = next.search.trim();
    setSearch({
      q: normalizedSearch ? normalizedSearch : null,
      orderStatus: next.orderStatus === "all" ? null : next.orderStatus,
      paymentStatus: next.paymentStatus === "all" ? null : next.paymentStatus,
      page: null,
    });
  }

  return (
    <div>
      <OrdersFilters tab={tab} initialFilters={filters} onApply={applyFilters} isNavigating={isNavigating} />

      <Panel>
        <DataTable table={table} columnClasses={{ totalPrice: "text-right", amountPaid: "text-right", actions: "text-right" }} cellClassName="align-top" />
        <TablePagination table={table} />
        {total === 0 && <div className="px-4 py-6 text-13 text-ink/55">{tab === "requests" ? "No pending requests." : "No orders match this filter."}</div>}
      </Panel>
    </div>
  );
}
