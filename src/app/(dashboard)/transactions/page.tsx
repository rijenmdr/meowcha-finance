import { getTransactionsPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { TransactionsTable } from "@/components/TransactionsTable";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const data = await getTransactionsPage(toSearchParams(await searchParams));

  return (
    <TransactionsTable
      rows={data.rows}
      total={data.total}
      query={data.query}
      filterType={data.filterType}
      filterCategory={data.filterCategory}
      countLabel={data.countLabel}
    />
  );
}
