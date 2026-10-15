import { getDeliveryProvidersPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { DeliveryProvidersTable } from "@/components/DeliveryProvidersTable";

export default async function DeliveryProvidersPage({ searchParams }: PageProps<"/delivery-providers">) {
  const data = await getDeliveryProvidersPage(toSearchParams(await searchParams));

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
