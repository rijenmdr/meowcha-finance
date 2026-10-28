import type { getOrdersPage } from "@/lib/queries/order";
import { StatCard } from "@/components/shared/stat-card";
import { OrdersTable } from "./orders-table";
import { OrdersTabs } from "./orders-tabs";

type OrdersPageData = Awaited<ReturnType<typeof getOrdersPage>>;

function RequestStats({ data }: { data: OrdersPageData }) {
  return (
    <div className="mb-4.5 grid grid-cols-3 gap-4.5">
      <StatCard label="Pending requests" value={data.pendingRequestCountDisplay} />
      <StatCard label="Request value" value={data.requestValueDisplay} tinted />
      <StatCard label="Advances collected" value={data.advanceTotalDisplay} />
    </div>
  );
}

function OrderStats({ data }: { data: OrdersPageData }) {
  return (
    <div className="mb-4.5 grid grid-cols-4 gap-4.5">
      <StatCard label="Orders" value={data.orderCountDisplay} />
      <StatCard label="Order value" value={data.orderRevenueDisplay} tinted />
      <StatCard label="Balance due" value={data.orderBalanceDueDisplay} />
      <StatCard label="Not yet delivered" value={data.openOrderCountDisplay} />
    </div>
  );
}

export function OrdersContainer({ data }: { data: OrdersPageData }) {
  const filters = { search: data.search, orderStatus: data.filterOrderStatus, paymentStatus: data.filterPaymentStatus };

  return (
    <OrdersTabs tab={data.tab}>
      {data.tab === "requests" ? <RequestStats data={data} /> : <OrderStats data={data} />}
      <OrdersTable key={data.tab} tab={data.tab} rows={data.rows} total={data.total} query={data.query} filters={filters} />
    </OrdersTabs>
  );
}
