import { DeliveryProvidersContainer } from "@/components/containers/delivery-providers/delivery-providers-container";
import { getDeliveryProvidersPage } from "@/lib/queries/delivery-provider";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function DeliveryProvidersPage({ searchParams }: PageProps<"/delivery-providers">) {
  const data = await getDeliveryProvidersPage(toSearchParams(await searchParams));

  return <DeliveryProvidersContainer data={data} />;
}
