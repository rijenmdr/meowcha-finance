"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { DeliveryProvidersTable } from "@/components/DeliveryProvidersTable";

export default function DeliveryProvidersPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Providers" value={data.deliveryProviderCountDisplay} />
        <StatCard label="Delivery charges" value={data.providerDeliveryChargesDisplay} tinted />
        <StatCard label="Orders without provider" value={data.ordersWithoutProviderDisplay} />
      </div>
      <DeliveryProvidersTable rows={data.deliveryProviderRows} empty={data.deliveryProvidersEmpty} />
    </div>
  );
}
