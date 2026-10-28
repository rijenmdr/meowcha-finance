"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DEFAULT_ADD_ACTION, PAGE_ADD_ACTIONS, PAGE_TITLES, REQUESTS_ADD_ACTION } from "@/constants/page-header";
import { parseOrdersTab } from "@/lib/helpers/table-params";
import { AddButton } from "./add-button";
import { DateFilterControls } from "./date-filter-controls";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The product and order form pages have their own title and buttons.
  if (pathname.startsWith("/products/") || pathname.startsWith("/orders/")) return null;

  const section = "/" + pathname.split("/")[1];
  // Requests are listed whatever the period, so their tab has no date filter.
  const isRequestsTab = pathname === "/orders" && parseOrdersTab(searchParams) === "requests";
  const [title, subtitle] = PAGE_TITLES[section] ?? PAGE_TITLES["/overview"];
  const addAction = isRequestsTab ? REQUESTS_ADD_ACTION : (PAGE_ADD_ACTIONS[section] ?? DEFAULT_ADD_ACTION);

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="mb-1 font-condensed text-32 font-semibold tracking-[-0.015em]">{title}</h1>
        <div className="text-13 text-ink/60">{subtitle}</div>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        {isRequestsTab ? <div className="py-2.25 text-12 text-ink/60">Every pending request, whatever the period</div> : <DateFilterControls />}
        <AddButton action={addAction} />
      </div>
    </div>
  );
}
