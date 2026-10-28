import "server-only";
import type { DeliveryProvider } from "@/models/delivery-provider";
import { dateRange } from "@/lib/helpers/date-filter";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function getDeliveryProviders(): Promise<DeliveryProvider[]> {
  const { data, error } = await getSupabase()
    .from("delivery_providers")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface DeliveryProviderSummary {
  orders_without_provider: number;
  rows: { id: string; name: string; order_count: number; in_range: number }[];
}

export async function getDeliveryProvidersPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<DeliveryProviderSummary>("delivery_provider_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.order_count,
    usageLabel: plural(x.order_count, "order"),
    inRangeCharges: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  return {
    rows,
    deliveryProvidersEmpty: rows.length === 0,
    deliveryProviderCountDisplay: String(rows.length),
    providerDeliveryChargesDisplay: fmtMoney(rows.reduce((a, r) => a + r.inRangeCharges, 0)),
    ordersWithoutProviderDisplay: String(s.orders_without_provider),
  };
}
