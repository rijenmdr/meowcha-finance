import { DATE_PRESET, type DatePreset } from "@/enums/date-preset";
import type { DateFilter } from "@/models/date-filter";
import { todayISO } from "@/lib/utils/date-math";
import type { SearchParamsLike } from "@/lib/utils/search-params";

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

const DATE_FILTER_PARAMS = ["period", "from", "to"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The date filter lives in the URL (?period=…&from=…&to=…). A missing period
// means today. Malformed custom dates fall back to this month, so a hand-edited
// link can't break the page.
export function parseDateFilter(params: SearchParamsLike, today: string): DateFilter {
  const period = params.get("period");
  const preset = Object.values(DATE_PRESET).find((p) => p === period) ?? "today";
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

// The range a page loader reports on, read from its URL params.
export function dateRange(params: URLSearchParams) {
  return parseDateFilter(params, todayISO());
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

// Keeps the date filter when moving to another dashboard page, plus any
// `extra` params for that page. Call it from event handlers only, since it
// reads window.location.
export function withDateFilter(path: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(pickDateFilterSearch(new URLSearchParams(window.location.search)));
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return path + (query ? "?" + query : "");
}
