import { getPaymentMethodsPage } from "@/lib/page-data";
import { toSearchParams } from "@/lib/table-params";
import { StatCard } from "@/components/StatCard";
import { PaymentMethodsTable } from "@/components/PaymentMethodsTable";

export default async function PaymentMethodsPage({ searchParams }: PageProps<"/payment-methods">) {
  const data = await getPaymentMethodsPage(toSearchParams(await searchParams));

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Methods" value={data.paymentMethodCountDisplay} />
        <StatCard label="Order value" value={data.methodOrderValueDisplay} tinted />
        <StatCard label="Orders without method" value={data.ordersWithoutMethodDisplay} />
      </div>
      <PaymentMethodsTable rows={data.rows} empty={data.paymentMethodsEmpty} />
    </div>
  );
}
