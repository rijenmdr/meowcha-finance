"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { CustomersTable } from "@/components/CustomersTable";

export default function CustomersPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Customers" value={data.customerCountDisplay} />
        <StatCard label="Linked income" value={data.customerIncomeDisplay} tinted />
        <StatCard label="Unlinked income" value={data.unlinkedIncomeDisplay} />
        <StatCard label="Top customer" value={data.topCustomerDisplay} />
      </div>
      <CustomersTable rows={data.customerRows} empty={data.customersEmpty} />
    </div>
  );
}
