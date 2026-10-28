import "server-only";
import type { PaymentMethod } from "@/models/payment-method";
import { dateRange } from "@/lib/helpers/date-filter";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await getSupabase()
    .from("payment_methods")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface PaymentMethodSummary {
  orders_without_method: number;
  rows: { id: string; name: string; order_count: number; in_range: number }[];
}

export async function getPaymentMethodsPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<PaymentMethodSummary>("payment_method_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.order_count,
    usageLabel: plural(x.order_count, "order"),
    inRangeValue: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  return {
    rows,
    paymentMethodsEmpty: rows.length === 0,
    paymentMethodCountDisplay: String(rows.length),
    methodOrderValueDisplay: fmtMoney(rows.reduce((a, r) => a + r.inRangeValue, 0)),
    ordersWithoutMethodDisplay: String(s.orders_without_method),
  };
}
