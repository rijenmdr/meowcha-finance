"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { OrderStatus } from "@/enums/order-status";
import type { OrdersTab } from "@/enums/orders-tab";
import type { PaymentStatus } from "@/enums/payment-status";

export type OrderStatusFilter = "all" | OrderStatus;
export type PaymentStatusFilter = "all" | PaymentStatus;

export interface OrderFiltersState {
  search: string;
  orderStatus: OrderStatusFilter;
  paymentStatus: PaymentStatusFilter;
}

const DEFAULT_FILTERS: OrderFiltersState = {
  search: "",
  orderStatus: "all",
  paymentStatus: "all",
};

const filterLabelClass = "text-11 text-ink/60";
const filterInputClass = "h-auto min-h-8.5 w-64 px-2 py-1.25 text-13";
const filterSelectClass = "w-44";

// Search applies after a pause in typing; the status selects apply at once.
export function OrdersFilters({
  tab,
  initialFilters,
  onApply,
  isNavigating,
}: {
  tab: OrdersTab;
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
  const isRequests = tab === "requests";

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="orders-search" className={filterLabelClass}>
          {isRequests ? "Search requests" : "Search orders"}
        </label>
        <Input
          id="orders-search"
          ref={searchInputRef}
          value={filters.search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder={isRequests ? "Order no, item, customer, phone" : "Order no, item, customer, phone, status"}
          className={filterInputClass}
        />
      </div>
      {!isRequests && (
        <>
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
              <NativeSelectOption value="cancelled">Cancelled</NativeSelectOption>
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
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="min-h-8.5 px-3 text-12">
        Clear filters
      </Button>
    </div>
  );
}
