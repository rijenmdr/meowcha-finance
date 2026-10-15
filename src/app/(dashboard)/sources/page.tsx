import { getSourcesPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { SourcesTable } from "@/components/SourcesTable";

export default async function SourcesPage({ searchParams }: PageProps<"/sources">) {
  const data = await getSourcesPage(toSearchParams(await searchParams));

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
