import type { getOverviewPage } from "@/lib/queries/overview";
import { SummaryCard } from "./summary-card";
import { CashFlowChart } from "./cash-flow-chart";
import { CategoryBreakdown } from "./category-breakdown";
import { RecentTransactions } from "./recent-transactions";

type OverviewPageData = Awaited<ReturnType<typeof getOverviewPage>>;

export function OverviewContainer({ data }: { data: OverviewPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <SummaryCard label="Income" value={data.incomeDisplay} valueClass="text-accent-600" delta={data.incomeDelta} />
        <SummaryCard label="Expenses" value={data.expenseDisplay} valueClass="text-ink" delta={data.expenseDelta} />
        <SummaryCard label="Net income" value={data.netDisplay} valueClass="text-accent-800" delta={data.netDelta} tinted />
      </div>

      <CashFlowChart buckets={data.cashFlow} isBarChart={data.isBarChart} />

      <div className="grid grid-cols-[1fr_1.3fr] gap-4.5">
        <CategoryBreakdown rows={data.categoryBreakdown} empty={data.categoryBreakdownEmpty} />
        <RecentTransactions rows={data.recentTransactions} />
      </div>
    </div>
  );
}
