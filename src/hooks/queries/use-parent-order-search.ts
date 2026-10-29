import { useRef, useState } from "react";
import { searchParentOrdersAction } from "@/lib/actions/order";
import type { ParentOrder } from "@/models/order";

const SEARCH_DELAY_MS = 250;

// Searches processing orders for the parent-order picker as the user types, a
// page at a time. Client-side because the results depend on keystrokes the
// server render never sees.
export function useParentOrderSearch() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ParentOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only the latest request's results are shown, so a slow early search can't win.
  const latest = useRef(0);

  async function load(text: string, nextPage: number) {
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await searchParentOrdersAction(text, nextPage);
      if (ticket !== latest.current) return;
      setRows((current) => (nextPage === 1 ? result.rows : [...current, ...result.rows]));
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      if (ticket !== latest.current) return;
      console.error("Failed to search orders", err);
      setError("Couldn't load orders. Try again.");
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  function changeSearch(text: string) {
    setSearch(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(text, 1), SEARCH_DELAY_MS);
  }

  // Called when the picker opens: shows the latest processing orders first.
  function start() {
    if (rows.length === 0 && !loading) load(search, 1);
  }

  function loadMore() {
    if (!loading) load(search, page + 1);
  }

  return { search, rows, hasMore, loading, error, changeSearch, start, loadMore };
}
