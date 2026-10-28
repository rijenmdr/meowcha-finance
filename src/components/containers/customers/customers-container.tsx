import type { getCustomersPage } from "@/lib/queries/customer";
import { StatCard } from "@/components/shared/stat-card";
import { CustomersTable } from "./customers-table";

type CustomersPageData = Awaited<ReturnType<typeof getCustomersPage>>;

export function CustomersContainer({ data }: { data: CustomersPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Customers" value={data.customerCountDisplay} />
        <StatCard label="Linked income" value={data.customerIncomeDisplay} tinted />
        <StatCard label="Unlinked income" value={data.unlinkedIncomeDisplay} />
        <StatCard label="Top customer" value={data.topCustomerDisplay} />
      </div>
      <CustomersTable rows={data.rows} empty={data.customersEmpty} />
    </div>
  );
}
