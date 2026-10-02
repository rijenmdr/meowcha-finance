"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { OrdersTable } from "@/components/OrdersTable";

export default function OrdersPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Orders" value={data.orderCountDisplay} />
        <StatCard label="Order value" value={data.orderRevenueDisplay} tinted />
        <StatCard label="Balance due" value={data.orderBalanceDueDisplay} />
        <StatCard label="Not yet delivered" value={data.openOrderCountDisplay} />
      </div>
      <OrdersTable rows={data.orderRows} empty={data.ordersEmpty} />
    </div>
  );
}
