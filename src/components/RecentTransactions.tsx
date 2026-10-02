import { cx } from "@/lib/cx";
import { Panel } from "./Panel";

interface RecentRow {
  id: string;
  description: string;
  dateDisplay: string;
  amountDisplay: string;
  amountClass: string;
}

const thClass = "border-b border-line p-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft p-2.5";

export function RecentTransactions({ rows }: { rows: RecentRow[] }) {
  return (
    <Panel className="p-5">
      <h3 className="mb-3.5 text-17 font-bold">Recent transactions</h3>
      <table className="w-full text-13">
        <thead>
          <tr>
            <th className={cx(thClass, "text-left")}>Date</th>
            <th className={cx(thClass, "text-left")}>Description</th>
            <th className={cx(thClass, "text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className={cx(tdClass, "text-ink/60")}>{t.dateDisplay}</td>
              <td className={tdClass}>{t.description}</td>
              <td className={cx(tdClass, "text-right font-semibold", t.amountClass)}>{t.amountDisplay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
