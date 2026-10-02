import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";

interface CategoryRow {
  id: string;
  name: string;
  usageLabel: string;
  budgeted: boolean;
}

const tdClass = "border-b border-line-soft px-4 py-2.5";

export function CategoriesTable({ type, rows }: { type: TxnType; rows: CategoryRow[] }) {
  const { openAddCategory, openEditCategory, deleteCategory } = useFinance();
  const title = type === "income" ? "Income" : "Expense";

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div className="font-condensed text-17 font-semibold">{title} categories</div>
        <button
          type="button"
          onClick={() => openAddCategory(type)}
          className="cursor-pointer border-none bg-transparent p-0 font-condensed text-13 font-semibold text-accent-500"
        >
          + Add
        </button>
      </div>
      <table className="w-full text-13">
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className={tdClass}>
                {c.name}
                {c.budgeted && <span className="ml-2 bg-accent-50 px-1.5 py-0.5 text-10 text-accent-700">Budgeted</span>}
              </td>
              <td className={cx(tdClass, "whitespace-nowrap text-ink/60")}>{c.usageLabel}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditCategory(c.id)} />
                <DeleteButton onClick={() => deleteCategory(c.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="px-4 py-6 text-13 text-ink/55">No {type} categories yet.</div>}
    </Panel>
  );
}
