"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { InvoicesTable } from "@/components/InvoicesTable";

export default function InvoicesPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Outstanding" value={data.outstandingDisplay} />
        <StatCard label="Overdue" value={data.overdueCountDisplay} />
        <StatCard label="Paid this period" value={data.paidDisplay} tinted />
      </div>
      <InvoicesTable rows={data.invoicesList} />
    </div>
  );
}
