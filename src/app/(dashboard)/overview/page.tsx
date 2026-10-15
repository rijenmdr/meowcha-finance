import { getOverviewPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { SummaryCard } from "@/components/SummaryCard";
import { CashFlowChart } from "@/components/CashFlowChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { RecentTransactions } from "@/components/RecentTransactions";

export default async function OverviewPage({ searchParams }: PageProps<"/overview">) {
  const data = await getOverviewPage(toSearchParams(await searchParams));

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
