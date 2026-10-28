export function monthKey(d: string): string {
  return d.slice(0, 7);
}

// The business runs on Nepal time. A fixed zone keeps the server render and
// the browser on the same date, whatever zone either machine is set to.
const BUSINESS_TIME_ZONE = "Asia/Kathmandu";

// Today's date as YYYY-MM-DD ("en-CA" formats dates that way).
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

// Date math below parses YYYY-MM-DD as UTC and reads it back with
// toISOString(). Mixing in local midnight shifts dates back a day east of UTC.
export function monthsBetweenInclusive(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

// Every YYYY-MM from start's month to end's month, inclusive.
export function monthKeysBetween(start: string, end: string): string[] {
  let [y, m] = start.split("-").map(Number);
  const last = monthKey(end);
  const out: string[] = [];
  for (let ym = monthKey(start); ym <= last; ) {
    out.push(ym);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    ym = y + "-" + String(m).padStart(2, "0");
  }
  return out;
}

export function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

export function addDays(d: string, n: number): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function inRange(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}
