import "server-only";
import type { Customer } from "@/models/customer";
import { dateRange } from "@/lib/helpers/date-filter";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("id, name, company, email, phone, notes")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface CustomerSummary {
  income: number;
  rows: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    in_range: number;
    lifetime: number;
    payment_count: number;
    last_date: string | null;
    order_count: number;
  }[];
}

export async function getCustomersPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<CustomerSummary>("customer_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company || "—",
    contact: [c.email, c.phone].filter(Boolean).join(" · ") || "—",
    inRangeIncome: c.in_range,
    inRangeDisplay: fmtMoney(c.in_range),
    lifetimeIncome: c.lifetime,
    lifetimeDisplay: fmtMoney(c.lifetime),
    lastDate: c.last_date ?? "",
    lastDisplay: c.last_date ? fmtDate(c.last_date) : "—",
    paymentsLabel: plural(c.payment_count, "payment"),
    orderCount: c.order_count,
  }));
  const linked = rows.reduce((a, r) => a + r.inRangeIncome, 0);
  const top = rows.reduce<(typeof rows)[number] | null>(
    (best, r) => (r.inRangeIncome > 0 && (!best || r.inRangeIncome > best.inRangeIncome) ? r : best),
    null,
  );

  return {
    rows,
    customersEmpty: rows.length === 0,
    customerCountDisplay: String(rows.length),
    customerIncomeDisplay: fmtMoney(linked),
    unlinkedIncomeDisplay: fmtMoney(s.income - linked),
    topCustomerDisplay: top ? top.name : "—",
  };
}
