import "server-only";
import type { Customer, CustomerOption } from "@/models/customer";
import type { PickerPage } from "@/models/picker";
import { dateRange } from "@/lib/helpers/date-filter";
import { pickerArgs, toPickerPage } from "@/lib/helpers/picker-page";
import { rpc } from "@/lib/supabase/rpc";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function searchCustomers(search: string, page: number): Promise<PickerPage<CustomerOption>> {
  const rows = await rpc<CustomerOption[]>("search_customers", pickerArgs(search, page));
  return toPickerPage(rows, (row) => ({ id: row.id, name: row.name, company: row.company }));
}

interface CustomerSummary {
  income: number;
  rows: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    notes: string;
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
    customer: { id: c.id, name: c.name, company: c.company, email: c.email, phone: c.phone, notes: c.notes } satisfies Customer,
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
