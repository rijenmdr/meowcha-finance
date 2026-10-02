import { Panel } from "./Panel";
import type { CategoryBreakdownRow } from "@/lib/calculations";

export function CategoryBreakdown({ rows, empty }: { rows: CategoryBreakdownRow[]; empty: boolean }) {
  return (
    <Panel className="p-5">
      <h3 className="mb-3.5 text-17 font-bold">Expenses by category</h3>
      <div className="flex flex-col gap-3">
        {rows.map((c) => (
          <div key={c.categoryId}>
            <div className="mb-1 flex justify-between text-13">
              <span>{c.category}</span>
              <span className="text-ink/70">{c.amountDisplay}</span>
            </div>
            <svg className="h-1.5 w-full bg-line-soft">
              <rect width={c.pctWidth} height="100%" className={c.barClass} />
            </svg>
          </div>
        ))}
        {empty && <div className="text-13 text-ink/55">No expenses in this period.</div>}
      </div>
    </Panel>
  );
}
