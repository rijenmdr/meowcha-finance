import { addDays, daysBetween, monthKeysBetween } from "@/lib/utils/date-math";
import { fmtDate, monthLabel } from "@/lib/utils/format-date";

export interface CashFlowBucket {
  key: string; // YYYY-MM-DD for a day, YYYY-MM for a month
  label: string;
  inc: number;
  exp: number;
}

// Ranges up to a month are plotted per day. A monthly bucket would collapse
// Today, This week and This month into a single point.
const DAILY_BUCKET_MAX_DAYS = 31;

export function isMonthlyCashFlow(dateStart: string, dateEnd: string): boolean {
  return daysBetween(dateStart, dateEnd) + 1 > DAILY_BUCKET_MAX_DAYS;
}

// Lays the database's per-day or per-month sums (see overview_summary) onto
// every day or month of the range, so quiet days still plot as zero.
export function buildCashFlowBuckets(
  sums: { key: string; income: number; expense: number }[],
  dateStart: string,
  dateEnd: string,
): CashFlowBucket[] {
  if (dateEnd < dateStart) return [];
  const daily = !isMonthlyCashFlow(dateStart, dateEnd);
  const keys = daily ? Array.from({ length: daysBetween(dateStart, dateEnd) + 1 }, (_, i) => addDays(dateStart, i)) : monthKeysBetween(dateStart, dateEnd);
  const byKey = new Map(sums.map((s) => [s.key, s]));
  return keys.map((key) => ({
    key,
    label: daily ? fmtDate(key) : monthLabel(key),
    inc: byKey.get(key)?.income ?? 0,
    exp: byKey.get(key)?.expense ?? 0,
  }));
}
