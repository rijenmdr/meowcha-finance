import type { getBudgetPage } from "@/lib/queries/budget";
import { StatCard } from "@/components/shared/stat-card";
import { BudgetTable } from "./budget-table";

type BudgetPageData = Awaited<ReturnType<typeof getBudgetPage>>;

export function BudgetContainer({ data }: { data: BudgetPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Total budgeted" value={data.totalBudgetDisplay} />
        <StatCard label="Actual spend" value={data.totalActualDisplay} />
        <StatCard label="Remaining" value={data.totalRemainingDisplay} tinted />
      </div>
      <BudgetTable rows={data.rows} monthsInRangeLabel={data.monthsInRangeLabel} />
    </div>
  );
}
