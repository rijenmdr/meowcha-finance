import "server-only";
import type { TableQuery } from "@/lib/helpers/table-params";
import { getSupabase } from "./server";

// Calls one of the reporting functions in schema.sql, which all return jsonb.
// The page loaders in lib/queries send each page's date range (and table
// page/sort) through here, so filtering and aggregating happen in Postgres.
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// Fetches one page of a list function. A page past the end (after deletes, or
// from an old link) is replaced by the last page.
export async function pagedRpc<T extends { total: number }>(fn: string, args: Record<string, unknown>, query: TableQuery) {
  const fetchPage = (q: TableQuery) =>
    rpc<T>(fn, { ...args, p_sort: q.sort, p_desc: q.desc, p_limit: q.pageSize, p_offset: (q.page - 1) * q.pageSize });
  const result = await fetchPage(query);
  const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize));
  if (query.page <= lastPage) return { result, query };
  const clamped = { ...query, page: lastPage };
  return { result: await fetchPage(clamped), query: clamped };
}
