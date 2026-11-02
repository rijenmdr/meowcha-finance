"use client";

import { SearchCombobox } from "@/components/ui/search-combobox";
import { searchParentOrdersAction } from "@/lib/actions/order";
import { fmtDate } from "@/lib/utils/format-date";
import type { ParentOrder } from "@/models/order";

// Links a new request to a processing order. The search runs on the server, a page at a time.
export function ParentOrderPicker({ id, value, onChange }: { id: string; value: ParentOrder | null; onChange: (order: ParentOrder | null) => void }) {
  return (
    <SearchCombobox
      id={id}
      value={value}
      onChange={onChange}
      search={searchParentOrdersAction}
      getKey={(order) => order.id}
      renderValue={(order) => `${order.orderNumber} · ${order.customerName}`}
      renderOption={(order) => (
        <>
          <div className="font-semibold">{order.orderNumber}</div>
          <div className="truncate text-12 text-ink/60">
            {order.customerName} · {fmtDate(order.orderDate)}
          </div>
        </>
      )}
      placeholder="No parent order"
      searchPlaceholder="Search order number or customer…"
      emptyText="No processing orders found."
      noneLabel="No parent order"
    />
  );
}
