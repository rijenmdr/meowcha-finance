import type { getSourcesPage } from "@/lib/queries/source";
import { StatCard } from "@/components/shared/stat-card";
import { SourcesTable } from "./sources-table";

type SourcesPageData = Awaited<ReturnType<typeof getSourcesPage>>;

export function SourcesContainer({ data }: { data: SourcesPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Sources" value={data.sourceCountDisplay} />
        <StatCard label="Sourced expenses" value={data.sourcedExpenseDisplay} tinted />
        <StatCard label="Unsourced expenses" value={data.unsourcedExpenseDisplay} />
      </div>
      <SourcesTable rows={data.rows} empty={data.sourcesEmpty} />
    </div>
  );
}
