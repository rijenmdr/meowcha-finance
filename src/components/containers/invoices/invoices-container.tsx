import type { getInvoicesPage } from "@/lib/queries/invoice";
import { StatCard } from "@/components/shared/stat-card";
import { InvoicesTable } from "./invoices-table";

type InvoicesPageData = Awaited<ReturnType<typeof getInvoicesPage>>;

export function InvoicesContainer({ data }: { data: InvoicesPageData }) {
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
