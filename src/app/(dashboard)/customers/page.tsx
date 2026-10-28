import { CustomersContainer } from "@/components/containers/customers/customers-container";
import { getCustomersPage } from "@/lib/queries/customer";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const data = await getCustomersPage(toSearchParams(await searchParams));

  return <CustomersContainer data={data} />;
}
