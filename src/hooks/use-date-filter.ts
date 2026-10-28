import { useMemo, useOptimistic } from "react";
import { useSearchParams } from "next/navigation";
import { dateFilterSearch, parseDateFilter } from "@/lib/helpers/date-filter";
import { todayISO } from "@/lib/utils/date-math";
import type { DatePreset } from "@/enums/date-preset";
import type { DateFilter } from "@/models/date-filter";
import { useUrlSearch } from "./use-url-search";

// The date filter lives in the URL. It shows the new value straight away,
// while the page for the new range loads.
export function useDateFilter() {
  const { replaceSearch } = useUrlSearch();
  const searchParams = useSearchParams();
  const urlDateFilter = useMemo(() => parseDateFilter(searchParams, todayISO()), [searchParams]);
  const [dateFilter, setOptimisticDateFilter] = useOptimistic(urlDateFilter);

  function writeDateFilter(next: DateFilter) {
    replaceSearch(dateFilterSearch(new URLSearchParams(window.location.search), next), () => setOptimisticDateFilter(next));
  }

  function setDateStart(start: string) {
    writeDateFilter({ ...dateFilter, preset: "custom", start });
  }

  function setDateEnd(end: string) {
    writeDateFilter({ ...dateFilter, preset: "custom", end });
  }

  // Custom keeps the current range, so the date inputs start from what was shown.
  function setDatePreset(preset: DatePreset) {
    if (preset === "custom") {
      writeDateFilter({ ...dateFilter, preset });
      return;
    }
    writeDateFilter(parseDateFilter(new URLSearchParams({ period: preset }), todayISO()));
  }

  return { dateFilter, setDateStart, setDateEnd, setDatePreset };
}
