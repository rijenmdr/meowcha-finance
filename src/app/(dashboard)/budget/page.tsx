"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { BudgetTable } from "@/components/BudgetTable";

export default function BudgetPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Total budgeted" value={data.totalBudgetDisplay} />
        <StatCard label="Actual spend" value={data.totalActualDisplay} />
        <StatCard label="Remaining" value={data.totalRemainingDisplay} tinted />
      </div>
      <BudgetTable rows={data.budgetRows} monthsInRangeLabel={data.monthsInRangeLabel} />
    </div>
  );
}
