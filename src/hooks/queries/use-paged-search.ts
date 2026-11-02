import { useEffect, useRef, useState } from "react";
import type { PickerPage } from "@/models/picker";

const SEARCH_DELAY_MS = 250;

// Searches a server-side list as the user types, a page at a time. Client-side
// because the results depend on keystrokes the server render never sees.
export function usePagedSearch<T>(search: (text: string, page: number) => Promise<PickerPage<T>>) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only the latest request's results are shown, so a slow early search can't win.
  const latest = useRef(0);
  // The caller's search may close over values that change (e.g. variants already picked).
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });

  async function load(query: string, nextPage: number) {
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await searchRef.current(query, nextPage);
      if (ticket !== latest.current) return;
      setRows((current) => (nextPage === 1 ? result.rows : [...current, ...result.rows]));
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      if (ticket !== latest.current) return;
      console.error("Search failed", err);
      setError("Couldn't load results. Try again.");
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  function changeText(next: string) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(next, 1), SEARCH_DELAY_MS);
  }

  // Called when the picker opens: reloads the first page, since what the search
  // excludes or the data itself may have changed since it last opened.
  function start() {
    clearTimeout(timer.current);
    load(text, 1);
  }

  function loadMore() {
    if (!loading) load(text, page + 1);
  }

  return { text, rows, hasMore, loading, error, changeText, start, loadMore };
}
