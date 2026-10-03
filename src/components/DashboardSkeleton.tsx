import { Panel } from "./Panel";
import { Skeleton } from "@/components/ui/skeleton";

// Stands in for Header + page content while the dashboard layout loads data.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-8 w-48 rounded-none bg-ink/8" />
          <Skeleton className="h-3.5 w-72 rounded-none bg-ink/8" />
        </div>
        <Skeleton className="h-9 w-36 rounded-none bg-ink/8" />
      </div>

      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        {[0, 1, 2].map((i) => (
          <Panel key={i} className="p-5">
            <Skeleton className="mb-3 h-3 w-20 rounded-none bg-ink/8" />
            <Skeleton className="h-7 w-32 rounded-none bg-ink/8" />
          </Panel>
        ))}
      </div>

      <Panel className="mb-4.5 p-5">
        <Skeleton className="mb-4 h-4 w-28 rounded-none bg-ink/8" />
        <Skeleton className="h-56 w-full rounded-none bg-ink/8" />
      </Panel>

      <div className="grid grid-cols-[1fr_1.3fr] gap-4.5">
        {[0, 1].map((i) => (
          <Panel key={i} className="flex flex-col gap-3 p-5">
            <Skeleton className="mb-1 h-4 w-32 rounded-none bg-ink/8" />
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-3.5 w-full rounded-none bg-ink/8" />
            ))}
          </Panel>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
