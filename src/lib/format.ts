import type { DateFilter, DatePreset } from "./types";

export function fmtMoney(n: number): string {
  const neg = n < 0;
  // Nepali Rupees, grouped the South Asian way (lakh/crore): Rs 1,23,456.00
  const v = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "–" : "") + "Rs " + v;
}

// A variant's option values in the product's option order, e.g. "Olive, Lined".
export function variantLabel(optionNames: string[], options: Record<string, string>): string {
  return optionNames.map((n) => options[n]).filter(Boolean).join(", ");
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

// Each preset runs from the start of its period up to `today`. Weeks start on
// Sunday. UTC math keeps toISOString from shifting the date by the local offset.
export function presetRange(preset: Exclude<DatePreset, "custom">, today: string): { start: string; end: string } {
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "week": {
      const dt = new Date(today + "T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
      return { start: dt.toISOString().slice(0, 10), end: today };
    }
    case "month":
      return { start: today.slice(0, 8) + "01", end: today };
    case "year":
      return { start: today.slice(0, 5) + "01-01", end: today };
  }
}

const DATE_PRESETS: DatePreset[] = ["today", "week", "month", "year", "custom"];
const DATE_FILTER_PARAMS = ["period", "from", "to"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface SearchParamsLike {
  get(name: string): string | null;
}

// The date filter lives in the URL (?period=…&from=…&to=…). A missing period
// means today. Malformed custom dates fall back to this month, so a hand-edited
// link can't break the page.
export function parseDateFilter(params: SearchParamsLike, today: string): DateFilter {
  const period = params.get("period");
  const preset = DATE_PRESETS.find((p) => p === period) ?? "today";
  if (preset !== "custom") return { preset, ...presetRange(preset, today) };
  const fallback = presetRange("month", today);
  const from = params.get("from");
  const to = params.get("to");
  return {
    preset,
    start: from && ISO_DATE.test(from) ? from : fallback.start,
    end: to && ISO_DATE.test(to) ? to : fallback.end,
  };
}

// Sets the filter's params on a copy of `params`, keeping any others except the
// table page, which may not exist in the new range. Only a custom range needs
// from/to; the presets are recomputed from today.
export function dateFilterSearch(params: URLSearchParams, f: DateFilter): string {
  const out = new URLSearchParams(params);
  for (const k of [...DATE_FILTER_PARAMS, "page"]) out.delete(k);
  out.set("period", f.preset);
  if (f.preset === "custom") {
    out.set("from", f.start);
    out.set("to", f.end);
  }
  return "?" + out.toString();
}

// Just the filter's params, for carrying the filter onto another page's link.
export function pickDateFilterSearch(params: SearchParamsLike): string {
  const out = new URLSearchParams();
  for (const k of DATE_FILTER_PARAMS) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  const q = out.toString();
  return q ? "?" + q : "";
}

export function inRange(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}
