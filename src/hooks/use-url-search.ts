import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/stores/use-navigation-store";

// Every URL change is a navigation the server renders, so it runs in a
// transition: the current page stays up (dimmed) until the new one arrives.
export function useUrlSearch() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // The store is outside React, so the pending transition is synced into it.
  useEffect(() => {
    if (!isPending) return;
    const { begin, end } = useNavigationStore.getState();
    begin();
    return end;
  }, [isPending]);

  // Replaces the whole query string. onStart runs inside the transition, for optimistic updates.
  const replaceSearch = useCallback(
    (search: string, onStart?: () => void) => {
      startTransition(() => {
        onStart?.();
        router.replace(window.location.pathname + search, { scroll: false });
      });
    },
    [router],
  );

  // Sets (or with null, removes) URL params, which re-renders the page on the server.
  const setSearch = useCallback(
    (patch: Record<string, string | null>, onStart?: () => void) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      replaceSearch(query ? "?" + query : "", onStart);
    },
    [replaceSearch],
  );

  return { setSearch, replaceSearch };
}
