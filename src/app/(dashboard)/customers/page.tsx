import { getCustomersPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { CustomersTable } from "@/components/CustomersTable";

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const data = await getCustomersPage(toSearchParams(await searchParams));

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
