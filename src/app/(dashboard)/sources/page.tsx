"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { SourcesTable } from "@/components/SourcesTable";

export default function SourcesPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Sources" value={data.sourceCountDisplay} />
        <StatCard label="Sourced expenses" value={data.sourcedExpenseDisplay} tinted />
        <StatCard label="Unsourced expenses" value={data.unsourcedExpenseDisplay} />
      </div>
      <SourcesTable rows={data.sourceRows} empty={data.sourcesEmpty} />
    </div>
  );
}
