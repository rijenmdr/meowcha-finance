import { ACCENT_RAMP } from "./mock-data";
import { addDays, daysBetween, fmtDate, fmtMoney, monthKeysBetween, monthLabel } from "./format";
import type { OrderItem, PaymentStatus } from "./types";

export interface DeltaBits {
  label: string;
  colorClass: string;
  arrow: string;
}

// goodIsUp: whether an increase counts as a positive change (income/net) or
// a negative one (expenses, where "up" is bad).
export function deltaPct(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function deltaBits(cur: number, prev: number, goodIsUp: boolean): DeltaBits {
  const pct = deltaPct(cur, prev);
  const up = pct >= 0;
  const good = goodIsUp ? up : !up;
  return {
    label: (up ? "+" : "") + pct.toFixed(1) + "%",
    colorClass: good ? "text-accent-600" : "text-muted-foreground",
    arrow: up ? "M7 7h10v10 M7 17 17 7" : "m7 7 10 10 M17 7v10H7",
  };
}

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

// Mirrors the DB's derived order columns (orders.sub_total via save_order(),
// total_price and payment_status as generated columns).
export function orderTotals(
  items: Pick<OrderItem, "subTotal">[],
  deliveryCharge: number,
  amountPaid: number,
): { subTotal: number; totalPrice: number; paymentStatus: PaymentStatus } {
  const subTotal = roundMoney(items.reduce((a, i) => a + i.subTotal, 0));
  const totalPrice = roundMoney(subTotal + deliveryCharge);
  return { subTotal, totalPrice, paymentStatus: amountPaid >= totalPrice ? "paid" : "partially_paid" };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
