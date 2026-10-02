import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import type { DeltaBits } from "@/lib/calculations";

export function SummaryCard({
  label,
  value,
  valueClass,
  delta,
  tinted,
}: {
  label: string;
  value: string;
  valueClass: string;
  delta: DeltaBits;
  tinted?: boolean;
}) {
  return (
    <Panel className="px-5 py-4.5" tinted={tinted}>
      <div className="mb-2 text-10 tracking-widest text-accent-500 uppercase">{label}</div>
      <div className={cx("font-condensed text-30 font-semibold", valueClass)}>{value}</div>
      <div className="mt-2 flex items-center gap-1.25 text-12 text-ink/65">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={delta.colorClass}
        >
          <path d={delta.arrow} />
        </svg>
        <span>{delta.label} vs prior period</span>
      </div>
    </Panel>
  );
}
