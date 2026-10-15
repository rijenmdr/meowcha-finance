import { getBudgetPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { BudgetTable } from "@/components/BudgetTable";

export default async function BudgetPage({ searchParams }: PageProps<"/budget">) {
  const data = await getBudgetPage(toSearchParams(await searchParams));

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
