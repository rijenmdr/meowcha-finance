import { cx } from "@/lib/cx";
import { Panel } from "./Panel";

const barClass = "animate-pulse bg-ink/8";

// Stands in for Header + page content while the dashboard layout loads data.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className={cx(barClass, "mb-2 h-8 w-48")} />
          <div className={cx(barClass, "h-3.5 w-72")} />
        </div>
        <div className={cx(barClass, "h-9 w-36")} />
      </div>

      <div className="mb-4.5 grid grid-cols-3 gap-4.5">
        {[0, 1, 2].map((i) => (
          <Panel key={i} className="p-5">
            <div className={cx(barClass, "mb-3 h-3 w-20")} />
            <div className={cx(barClass, "h-7 w-32")} />
          </Panel>
        ))}
      </div>

      <Panel className="mb-4.5 p-5">
        <div className={cx(barClass, "mb-4 h-4 w-28")} />
        <div className={cx(barClass, "h-56 w-full")} />
      </Panel>

      <div className="grid grid-cols-[1fr_1.3fr] gap-4.5">
        {[0, 1].map((i) => (
          <Panel key={i} className="flex flex-col gap-3 p-5">
            <div className={cx(barClass, "mb-1 h-4 w-32")} />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className={cx(barClass, "h-3.5 w-full")} />
            ))}
          </Panel>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
