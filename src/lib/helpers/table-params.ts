import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/constants/pagination";
import type { OrdersTab } from "@/enums/orders-tab";
import type { SearchParamsLike } from "@/lib/utils/search-params";

export function parseOrdersTab(params: SearchParamsLike): OrdersTab {
  return params.get("tab") === "requests" ? "requests" : "orders";
}

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
