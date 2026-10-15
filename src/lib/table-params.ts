import type { SearchParamsLike } from "./format";

// What a page receives as `searchParams`.
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toSearchParams(record: SearchParamsRecord): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value) && value.length > 0) out.set(key, value[0]);
  }
  return out;
}

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

// A server-paginated table's page and sort, kept in the URL
// (?page=2&size=20&sort=amount&dir=asc). page is 1-based.
export interface TableQuery {
  page: number;
  pageSize: number;
  sort: string;
  desc: boolean;
}

// Unknown sort keys and page sizes fall back to the defaults, so a
// hand-edited link can't reach the database with anything unexpected.
export function parseTableQuery(
  params: SearchParamsLike,
  sorts: readonly string[],
  fallback: { sort: string; desc: boolean },
): TableQuery {
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const size = Number(params.get("size"));
  const sort = params.get("sort");
  const known = sort !== null && sorts.includes(sort);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZES.find((s) => s === size) ?? DEFAULT_PAGE_SIZE,
    sort: known ? sort : fallback.sort,
    desc: known ? params.get("dir") !== "asc" : fallback.desc,
  };
}
