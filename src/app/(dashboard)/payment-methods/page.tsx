"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { PaymentMethodsTable } from "@/components/PaymentMethodsTable";

export default function PaymentMethodsPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        <StatCard label="Methods" value={data.paymentMethodCountDisplay} />
        <StatCard label="Order value" value={data.methodOrderValueDisplay} tinted />
        <StatCard label="Orders without method" value={data.ordersWithoutMethodDisplay} />
      </div>
      <PaymentMethodsTable rows={data.paymentMethodRows} empty={data.paymentMethodsEmpty} />
    </div>
  );
}
