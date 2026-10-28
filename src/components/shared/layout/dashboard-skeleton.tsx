import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/shared/panel";

// Darker than Skeleton's default bg-muted so the bars read on the canvas.
const barClass = "bg-ink/8";

// Stands in for Header + page content while the dashboard layout loads its lookups.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className={cn(barClass, "mb-2 h-8 w-48")} />
          <Skeleton className={cn(barClass, "h-3.5 w-72")} />
        </div>
        <Skeleton className={cn(barClass, "h-9 w-36")} />
      </div>
      <PageSkeleton />
    </div>
  );
}

// Stands in for a page's content while its server queries run (see (dashboard)/loading.tsx).
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        {[0, 1, 2].map((i) => (
          <Panel key={i} className="p-5">
            <Skeleton className={cn(barClass, "mb-3 h-3 w-20")} />
            <Skeleton className={cn(barClass, "h-7 w-32")} />
          </Panel>
        ))}
      </div>

      <Panel className="mb-4.5 p-5">
        <Skeleton className={cn(barClass, "mb-4 h-4 w-28")} />
        <Skeleton className={cn(barClass, "h-56 w-full")} />
      </Panel>

      <div className="grid grid-cols-[1fr_1.3fr] gap-4.5">
        {[0, 1].map((i) => (
          <Panel key={i} className="flex flex-col gap-3 p-5">
            <Skeleton className={cn(barClass, "mb-1 h-4 w-32")} />
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className={cn(barClass, "h-3.5 w-full")} />
            ))}
          </Panel>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
