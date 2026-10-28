import { ACCENT_RAMP } from "@/constants/chart-colors";
import { fmtMoney } from "@/lib/utils/format-money";

export interface CategoryBreakdownRow {
  categoryId: string;
  category: string;
  amountDisplay: string;
  pctWidth: string;
  barClass: string;
}

// rows are the top expense categories, largest first (see overview_summary).
export function buildCategoryBreakdown(
  rows: { categoryId: string; name: string; amount: number }[],
  totalExpense: number,
): CategoryBreakdownRow[] {
  return rows.map(({ categoryId, name, amount }, i) => ({
    categoryId,
    category: name,
    amountDisplay: fmtMoney(amount),
    pctWidth: (totalExpense > 0 ? Math.max(2, (amount / totalExpense) * 100) : 0) + "%",
    barClass: ACCENT_RAMP[i % ACCENT_RAMP.length],
  }));
}
