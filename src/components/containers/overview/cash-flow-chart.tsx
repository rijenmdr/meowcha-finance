"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Panel } from "@/components/shared/panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CashFlowBucket } from "@/lib/helpers/cash-flow";
import { fmtMoney } from "@/lib/utils/format-money";

const CHART_CONFIG = {
  inc: { label: "Income", color: "var(--color-accent-500)" },
  exp: { label: "Expenses", color: "var(--color-graphite)" },
} satisfies ChartConfig;

const tooltip = <ChartTooltip content={<ChartTooltipContent valueFormatter={fmtMoney} />} />;
const grid = <CartesianGrid vertical={false} />;
const xAxis = <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />;

// A line for a trend, bars when the range is a single day and a line would
// only be two dots.
export function CashFlowChart({ buckets, isBarChart }: { buckets: CashFlowBucket[]; isBarChart: boolean }) {
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
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-55 w-full">
        {isBarChart ? (
          <BarChart data={buckets} margin={{ left: 12, right: 12 }}>
            {grid}
            {xAxis}
            {tooltip}
            <Bar dataKey="inc" fill="var(--color-inc)" maxBarSize={60} />
            <Bar dataKey="exp" fill="var(--color-exp)" maxBarSize={60} />
          </BarChart>
        ) : (
          <LineChart data={buckets} margin={{ left: 12, right: 12 }}>
            {grid}
            {xAxis}
            {tooltip}
            <Line dataKey="inc" type="linear" stroke="var(--color-inc)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-inc)" }} />
            <Line
              dataKey="exp"
              type="linear"
              stroke="var(--color-exp)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "var(--color-exp)", strokeDasharray: "" }}
            />
          </LineChart>
        )}
      </ChartContainer>
    </Panel>
  );
}
