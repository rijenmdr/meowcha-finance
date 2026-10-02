export function fmtMoney(n: number): string {
  const neg = n < 0;
  // Nepali Rupees, grouped the South Asian way (lakh/crore): Rs 1,23,456.00
  const v = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "–" : "") + "Rs " + v;
}

// Matches the description add_order_payment() writes in the DB.
export function orderPaymentDescription(orderNumber: string): string {
  return "Payment for " + orderNumber;
}

export function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function monthKey(d: string): string {
  return d.slice(0, 7);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export function monthsBetweenInclusive(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

export function addDays(d: string, n: number): string {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function inRange(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}
