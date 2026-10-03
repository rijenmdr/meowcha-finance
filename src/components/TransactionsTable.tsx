import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface TxnRow {
  id: string;
  dateDisplay: string;
  description: string;
  category: string;
  channel: string;
  customerName: string | null;
  sourceName: string | null;
  amountDisplay: string;
  amountClass: string;
  tagClass: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const filterLabelClass = "text-11 text-ink/60";
const selectClass = "min-h-8.5 border border-line bg-surface px-2 py-1.25 text-13";
const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function TransactionsTable({
  rows,
  incomeCategories,
  expenseCategories,
  filterType,
  filterCategory,
  countLabel,
  empty,
}: {
  rows: TxnRow[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  filterType: string;
  filterCategory: string;
  countLabel: string;
  empty: boolean;
}) {
  const { setFilterType, setFilterCategory, openEditTxn, deleteTxn } = useFinance();
  const {
    pageRows,
    totalRows,
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    setRowsPerPage,
  } = usePagination(rows);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "all" | "income" | "expense")}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={filterLabelClass}>Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="all">All categories</option>
            {filterType !== "expense" && (
              <optgroup label="Income">
                {incomeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            )}
            {filterType !== "income" && (
              <optgroup label="Expense">
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="ml-auto self-end pb-2 text-12 text-ink/60">{countLabel}</div>
      </div>

      <Panel>
        <table className="w-full text-13">
          <thead>
            <tr>
              <th className={cx(thClass, "text-left")}>Date</th>
              <th className={cx(thClass, "text-left")}>Description</th>
              <th className={cx(thClass, "text-left")}>Category</th>
              <th className={cx(thClass, "text-left")}>Channel</th>
              <th className={cx(thClass, "text-right")}>Amount</th>
              <th className={cx(thClass, "text-right")}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => (
              <tr key={t.id}>
                <td className={cx(tdClass, "whitespace-nowrap text-ink/60")}>{t.dateDisplay}</td>
                <td className={tdClass}>
                  {t.description}
                  {t.customerName && <div className="mt-0.5 text-11 text-accent-600">{t.customerName}</div>}
                  {t.sourceName && <div className="mt-0.5 text-11 text-ink/60">Paid from {t.sourceName}</div>}
                </td>
                <td className={tdClass}>
                  <span className={cx("px-2 py-0.75 text-11", t.tagClass)}>{t.category}</span>
                </td>
                <td className={cx(tdClass, "text-ink/60")}>{t.channel}</td>
                <td className={cx(tdClass, "text-right font-semibold whitespace-nowrap", t.amountClass)}>{t.amountDisplay}</td>
                <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                  <EditButton onClick={() => openEditTxn(t.id)} />
                  <DeleteButton onClick={() => deleteTxn(t.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination
          totalRows={totalRows}
          startIndex={startIndex}
          endIndex={endIndex}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          onPreviousPage={previousPage}
          onNextPage={nextPage}
          onRowsPerPageChange={setRowsPerPage}
        />
        {empty && <div className="px-4 py-6 text-13 text-ink/55">No transactions match these filters.</div>}
      </Panel>
    </div>
  );
}
