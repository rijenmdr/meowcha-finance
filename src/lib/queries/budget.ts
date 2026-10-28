import "server-only";
import type { Budget } from "@/models/budget";
import { dateRange } from "@/lib/helpers/date-filter";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { monthsBetweenInclusive } from "@/lib/utils/date-math";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

export async function getBudgets(): Promise<Budget[]> {
  const { data, error } = await getSupabase().from("budgets").select("id, category_id, target");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, categoryId: row.category_id, target: row.target }));
}

type BudgetSummary = { id: string; category_id: string; category_name: string; target: number; actual: number }[];

export async function getBudgetPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const budgets = await rpc<BudgetSummary>("budget_summary", { p_start: start, p_end: end });
  // Targets are monthly, so they scale with the number of months the range touches.
  const months = monthsBetweenInclusive(start, end);
  const rows = budgets.map((b) => {
    const target = b.target * months;
    const pct = target > 0 ? (b.actual / target) * 100 : 0;
    const over = b.actual > target;
    return {
      id: b.id,
      category: b.category_name,
      target,
      targetDisplay: fmtMoney(target),
      actual: b.actual,
      actualDisplay: fmtMoney(b.actual),
      pctWidth: Math.min(100, pct) + "%",
      barClass: over ? "fill-accent-800" : "fill-accent-500",
      over,
      overAmountDisplay: fmtMoney(b.actual - target),
    };
  });
  const totalTarget = rows.reduce((a, r) => a + r.target, 0);
  const totalActual = rows.reduce((a, r) => a + r.actual, 0);

  return {
    rows,
    totalBudgetDisplay: fmtMoney(totalTarget),
    totalActualDisplay: fmtMoney(totalActual),
    totalRemainingDisplay: fmtMoney(totalTarget - totalActual),
    monthsInRangeLabel: plural(months, "month"),
  };
}
