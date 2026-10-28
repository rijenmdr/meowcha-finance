import type { getPaymentMethodsPage } from "@/lib/queries/payment-method";
import { StatCard } from "@/components/shared/stat-card";
import { PaymentMethodsTable } from "./payment-methods-table";

type PaymentMethodsPageData = Awaited<ReturnType<typeof getPaymentMethodsPage>>;

export function PaymentMethodsContainer({ data }: { data: PaymentMethodsPageData }) {
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
