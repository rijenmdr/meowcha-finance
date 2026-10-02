import { Panel } from "./Panel";

// Plain total card used on Budget and Invoices (label + big number, no delta
// row) — distinct from the Overview SummaryCard, which always shows a delta.
export function StatCard({ label, value, tinted }: { label: string; value: string; tinted?: boolean }) {
  return (
    <Panel className="px-5 py-4.5" tinted={tinted}>
      <div className="mb-2 text-10 tracking-widest text-accent-500 uppercase">{label}</div>
      <div className="font-condensed text-28 font-semibold">{value}</div>
    </Panel>
  );
}
