import { Panel } from "./Panel";
import type { ChartData } from "@/lib/calculations";

// Renders whichever mode the source's isBarChart/isLineChart flags select.
// The design's `chartStyle` prop defaults to "line" and there is no UI
// toggle in the template, so this app hardcodes the line-chart rendering.
export function CashFlowChart({ chart, isBarChart }: { chart: ChartData; isBarChart: boolean }) {
  return (
    <Panel className="mb-4.5 p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-17 font-bold">Cash flow trend</h3>
        <div className="flex gap-3.5 text-12 text-ink/65">
          <span className="flex items-center gap-1.25">
            <span className="inline-block size-2.5 bg-accent-500" />
            Income
          </span>
          <span className="flex items-center gap-1.25">
            <span className="inline-block size-2.5 bg-graphite" />
            Expenses
          </span>
        </div>
      </div>
      <svg viewBox="0 0 680 220" className="block h-55 w-full">
        {chart.chartGridLines.map((gl, i) => (
          <line key={i} x1="40" x2="670" y1={gl.y} y2={gl.y} strokeWidth="1" className="stroke-ink/10" />
        ))}
        {isBarChart ? (
          <>
            {chart.chartBarsIncome.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="fill-accent-500" />
            ))}
            {chart.chartBarsExpense.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="fill-graphite" />
            ))}
          </>
        ) : (
          <>
            <path d={chart.incomePathD} fill="none" strokeWidth="2" className="stroke-accent-500" />
            <path d={chart.expensePathD} fill="none" strokeWidth="2" strokeDasharray="4 3" className="stroke-graphite" />
            {chart.incomeDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="3" className="fill-accent-500" />
            ))}
            {chart.expenseDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="3" className="fill-graphite" />
            ))}
          </>
        )}
        {chart.chartMonths.map((m, i) => (
          <text key={i} x={m.x} y="212" fontSize="11" textAnchor="middle" className="fill-ink/60 font-sans">
            {m.label}
          </text>
        ))}
      </svg>
    </Panel>
  );
}
