import { OrdersContainer } from "@/components/containers/orders/orders-container";
import { getOrdersPage } from "@/lib/queries/order";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const data = await getOrdersPage(toSearchParams(await searchParams));

  return <OrdersContainer data={data} />;
}
