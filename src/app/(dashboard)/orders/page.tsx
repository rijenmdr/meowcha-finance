import { getOrdersPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { OrdersTable } from "@/components/OrdersTable";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const data = await getOrdersPage(toSearchParams(await searchParams));

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Orders" value={data.orderCountDisplay} />
        <StatCard label="Order value" value={data.orderRevenueDisplay} tinted />
        <StatCard label="Balance due" value={data.orderBalanceDueDisplay} />
        <StatCard label="Not yet delivered" value={data.openOrderCountDisplay} />
      </div>
      <OrdersTable rows={data.rows} total={data.total} query={data.query} />
    </div>
  );
}
