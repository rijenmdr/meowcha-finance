import { getInvoicesPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { InvoicesTable } from "@/components/InvoicesTable";

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const data = await getInvoicesPage(toSearchParams(await searchParams));

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Outstanding" value={data.outstandingDisplay} />
        <StatCard label="Overdue" value={data.overdueCountDisplay} />
        <StatCard label="Paid this period" value={data.paidDisplay} tinted />
      </div>
      <InvoicesTable rows={data.rows} total={data.total} query={data.query} />
    </div>
  );
}
