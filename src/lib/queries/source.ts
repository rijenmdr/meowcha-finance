import "server-only";
import type { Source } from "@/models/source";
import { dateRange } from "@/lib/helpers/date-filter";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function getSources(): Promise<Source[]> {
  const { data, error } = await getSupabase()
    .from("sources")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface SourceSummary {
  expense: number;
  rows: { id: string; name: string; expense_count: number; in_range: number }[];
}

export async function getSourcesPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<SourceSummary>("source_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.expense_count,
    usageLabel: plural(x.expense_count, "expense"),
    inRangeSpend: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  const sourced = rows.reduce((a, r) => a + r.inRangeSpend, 0);
  return {
    rows,
    sourcesEmpty: rows.length === 0,
    sourceCountDisplay: String(rows.length),
    sourcedExpenseDisplay: fmtMoney(sourced),
    unsourcedExpenseDisplay: fmtMoney(s.expense - sourced),
  };
}
