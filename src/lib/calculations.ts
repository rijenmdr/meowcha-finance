import { ACCENT_RAMP } from "./mock-data";
import { fmtMoney, monthKey, monthLabel, orderPaymentDescription } from "./format";
import type { Order, OrderItem, OrderPayment, PaymentStatus, Transaction } from "./types";

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
    colorClass: good ? "text-accent-600" : "text-muted",
    arrow: up ? "M7 7h10v10 M7 17 17 7" : "m7 7 10 10 M17 7v10H7",
  };
}

export interface MonthAgg {
  ym: string;
  label: string;
  inc: number;
  exp: number;
}

export function buildMonthAgg(filtered: Transaction[], dateStart: string, dateEnd: string): MonthAgg[] {
  const monthSet: string[] = [];
  const cur = new Date(dateStart + "T00:00:00");
  const end = new Date(dateEnd + "T00:00:00");
  let guard = 0;
  while (cur <= end && guard < 24) {
    const ym = cur.toISOString().slice(0, 7);
    if (!monthSet.includes(ym)) monthSet.push(ym);
    cur.setMonth(cur.getMonth() + 1);
    guard++;
  }
  return monthSet.map((ym) => {
    const inc = filtered
      .filter((t) => t.type === "income" && monthKey(t.date) === ym)
      .reduce((a, t) => a + t.amount, 0);
    const exp = filtered
      .filter((t) => t.type === "expense" && monthKey(t.date) === ym)
      .reduce((a, t) => a + t.amount, 0);
    return { ym, label: monthLabel(ym), inc, exp };
  });
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartBar {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChartMonth {
  label: string;
  x: number;
}

export interface ChartData {
  chartMonths: ChartMonth[];
  incomePathD: string;
  expensePathD: string;
  incomeDots: ChartPoint[];
  expenseDots: ChartPoint[];
  chartBarsIncome: ChartBar[];
  chartBarsExpense: ChartBar[];
  chartGridLines: { y: number }[];
}

export function buildChartData(monthAgg: MonthAgg[]): ChartData {
  const maxVal = Math.max(1, ...monthAgg.map((m) => Math.max(m.inc, m.exp)));
  const chartX0 = 50;
  const chartX1 = 660;
  const chartY0 = 20;
  const chartY1 = 190;
  const n = Math.max(1, monthAgg.length);
  const stepX = (chartX1 - chartX0) / Math.max(1, n - 1 || 1);
  const scaleY = (v: number) => chartY1 - (v / maxVal) * (chartY1 - chartY0);
  const xAt = (i: number) => (n === 1 ? (chartX0 + chartX1) / 2 : chartX0 + i * stepX);

  const chartMonths = monthAgg.map((m, i) => ({ label: m.label, x: xAt(i) }));
  const incomeDots = monthAgg.map((m, i) => ({ x: xAt(i), y: scaleY(m.inc) }));
  const expenseDots = monthAgg.map((m, i) => ({ x: xAt(i), y: scaleY(m.exp) }));

  const pathFrom = (pts: ChartPoint[]) =>
    pts.length ? pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") : "";

  const groupW = n === 1 ? 60 : stepX * 0.5;
  const barW = groupW / 2 - 3;
  const chartBarsIncome = monthAgg.map((m, i) => {
    const cx = xAt(i);
    const h = chartY1 - scaleY(m.inc);
    return { x: cx - groupW / 2, y: scaleY(m.inc), w: barW, h };
  });
  const chartBarsExpense = monthAgg.map((m, i) => {
    const cx = xAt(i);
    const h = chartY1 - scaleY(m.exp);
    return { x: cx - groupW / 2 + barW + 4, y: scaleY(m.exp), w: barW, h };
  });
  const chartGridLines = [0, 1, 2, 3].map((i) => ({ y: chartY0 + (i * (chartY1 - chartY0)) / 3 }));

  return {
    chartMonths,
    incomePathD: pathFrom(incomeDots),
    expensePathD: pathFrom(expenseDots),
    incomeDots,
    expenseDots,
    chartBarsIncome,
    chartBarsExpense,
    chartGridLines,
  };
}

export interface CategoryBreakdownRow {
  categoryId: string;
  category: string;
  amountDisplay: string;
  pctWidth: string;
  barClass: string;
}

export function buildCategoryBreakdown(
  filtered: Transaction[],
  totalExpense: number,
  categoryName: (id: string) => string,
): CategoryBreakdownRow[] {
  const catMap: Record<string, number> = {};
  filtered
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  return catEntries.slice(0, 6).map(([categoryId, amount], i) => ({
    categoryId,
    category: categoryName(categoryId),
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

// Mirrors the DB trigger that keeps orders.amount_paid equal to the sum of
// each order's payment transactions.
export function syncOrderPayments(orders: Order[], transactions: Transaction[]): Order[] {
  const paid = new Map<string, number>();
  for (const t of transactions) if (t.orderId) paid.set(t.orderId, (paid.get(t.orderId) ?? 0) + t.amount);
  return orders.map((o) => {
    const amountPaid = roundMoney(paid.get(o.id) ?? 0);
    return amountPaid === o.amountPaid ? o : { ...o, amountPaid, ...orderTotals(o.items, o.deliveryCharge, amountPaid) };
  });
}

// The income transaction add_order_payment() inserts for a payment.
export function orderPaymentTransaction(order: Pick<Order, "id" | "orderNumber" | "customerId">, payment: OrderPayment): Transaction {
  return {
    id: payment.id,
    date: payment.date,
    type: "income",
    categoryId: payment.categoryId,
    description: orderPaymentDescription(order.orderNumber),
    amount: payment.amount,
    channelId: payment.channelId,
    sourceId: null,
    customerId: order.customerId,
    orderId: order.id,
  };
}
