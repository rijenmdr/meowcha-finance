import { getTransactionsPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const data = await getTransactionsPage(toSearchParams(await searchParams));

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Income" value={data.incomeDisplay} tinted />
        <StatCard label="Expense" value={data.expenseDisplay} />
        <StatCard label="Cash flow" value={data.cashFlowDisplay} />
      </div>
      <TransactionsTable
        rows={data.rows}
        total={data.total}
        query={data.query}
        filterType={data.filterType}
        filterCategory={data.filterCategory}
        countLabel={data.countLabel}
      />
    </div>
  );
}
