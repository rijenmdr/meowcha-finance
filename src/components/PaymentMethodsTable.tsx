import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";

interface PaymentMethodRow {
  id: string;
  name: string;
  usageLabel: string;
  inRangeDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function PaymentMethodsTable({ rows, empty }: { rows: PaymentMethodRow[]; empty: boolean }) {
  const { openEditPaymentMethod, deletePaymentMethod } = useFinance();

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          <tr>
            <th className={cx(thClass, "text-left")}>Method</th>
            <th className={cx(thClass, "text-left")}>Usage</th>
            <th className={cx(thClass, "text-right")}>Order value in range</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className={cx(tdClass, "font-semibold")}>{x.name}</td>
              <td className={cx(tdClass, "whitespace-nowrap text-ink/60")}>{x.usageLabel}</td>
              <td className={cx(tdClass, "text-right font-semibold whitespace-nowrap")}>{x.inRangeDisplay}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditPaymentMethod(x.id)} />
                <DeleteButton onClick={() => deletePaymentMethod(x.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No payment methods yet. Add one, then pick it on an order.</div>}
    </Panel>
  );
}
