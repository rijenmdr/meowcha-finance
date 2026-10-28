import { InvoicesContainer } from "@/components/containers/invoices/invoices-container";
import { getInvoicesPage } from "@/lib/queries/invoice";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const data = await getInvoicesPage(toSearchParams(await searchParams));

  return <InvoicesContainer data={data} />;
}
