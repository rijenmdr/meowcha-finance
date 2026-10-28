import { TransactionsContainer } from "@/components/containers/transactions/transactions-container";
import { getTransactionsPage } from "@/lib/queries/transaction";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const data = await getTransactionsPage(toSearchParams(await searchParams));

  return <TransactionsContainer data={data} />;
}
