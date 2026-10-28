import type { getDeliveryProvidersPage } from "@/lib/queries/delivery-provider";
import { StatCard } from "@/components/shared/stat-card";
import { DeliveryProvidersTable } from "./delivery-providers-table";

type DeliveryProvidersPageData = Awaited<ReturnType<typeof getDeliveryProvidersPage>>;

export function DeliveryProvidersContainer({ data }: { data: DeliveryProvidersPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Providers" value={data.deliveryProviderCountDisplay} />
        <StatCard label="Delivery charges" value={data.providerDeliveryChargesDisplay} tinted />
        <StatCard label="Orders without provider" value={data.ordersWithoutProviderDisplay} />
      </div>
      <DeliveryProvidersTable rows={data.rows} empty={data.deliveryProvidersEmpty} />
    </div>
  );
}
