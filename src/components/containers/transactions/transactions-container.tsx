import type { getTransactionsPage } from "@/lib/queries/transaction";
import { StatCard } from "@/components/shared/stat-card";
import { TransactionsTable } from "./transactions-table";

type TransactionsPageData = Awaited<ReturnType<typeof getTransactionsPage>>;

export function TransactionsContainer({ data }: { data: TransactionsPageData }) {
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
        filters={{ type: data.filterType, category: data.filterCategory }}
        countLabel={data.countLabel}
      />
    </div>
  );
}
