import "server-only";
import type { TxnType } from "@/enums/txn-type";
import { buildCashFlowBuckets, isMonthlyCashFlow } from "@/lib/helpers/cash-flow";
import { buildCategoryBreakdown } from "@/lib/helpers/category-breakdown";
import { dateRange } from "@/lib/helpers/date-filter";
import { deltaBits } from "@/lib/helpers/delta";
import { signedAmount } from "@/lib/helpers/signed-amount";
import { rpc } from "@/lib/supabase/rpc";
import { addDays, daysBetween } from "@/lib/utils/date-math";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";

interface OverviewSummary {
  income: number;
  expense: number;
  prev_income: number;
  prev_expense: number;
  cash_flow: { key: string; income: number; expense: number }[];
  expense_categories: { category_id: string; name: string; amount: number }[];
  recent: { id: string; date: string; type: TxnType; description: string; amount: number }[];
}

export async function getOverviewPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  // The prior period is the same number of days, ending the day before.
  const rangeDays = daysBetween(start, end) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(rangeDays - 1));
  const s = await rpc<OverviewSummary>("overview_summary", {
    p_start: start,
    p_end: end,
    p_prev_start: prevStart,
    p_prev_end: prevEnd,
    p_monthly: isMonthlyCashFlow(start, end),
  });
  const net = s.income - s.expense;
  const buckets = buildCashFlowBuckets(s.cash_flow, start, end);
  const categoryBreakdown = buildCategoryBreakdown(
    s.expense_categories.map((c) => ({ categoryId: c.category_id, name: c.name, amount: c.amount })),
    s.expense,
  );

  return {
    incomeDisplay: fmtMoney(s.income),
    expenseDisplay: fmtMoney(s.expense),
    netDisplay: fmtMoney(net),
    incomeDelta: deltaBits(s.income, s.prev_income, true),
    expenseDelta: deltaBits(s.expense, s.prev_expense, false),
    netDelta: deltaBits(net, s.prev_income - s.prev_expense, true),
    cashFlow: buckets,
    isBarChart: buckets.length === 1,
    categoryBreakdown,
    categoryBreakdownEmpty: categoryBreakdown.length === 0,
    recentTransactions: s.recent.map((t) => ({
      id: t.id,
      description: t.description,
      dateDisplay: fmtDate(t.date),
      ...signedAmount(t.type, t.amount),
    })),
  };
}
