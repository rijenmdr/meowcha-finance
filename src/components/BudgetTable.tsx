import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface BudgetRow {
  id: string;
  category: string;
  targetDisplay: string;
  actualDisplay: string;
  pctWidth: string;
  barClass: string;
  over: boolean;
  overAmountDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function BudgetTable({ rows, monthsInRangeLabel }: { rows: BudgetRow[]; monthsInRangeLabel: string }) {
  const { openEditBudget, deleteBudget } = useFinance();
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
    <Panel>
      <table className="w-full text-13">
        <thead>
          <tr>
            <th className={cx(thClass, "text-left")}>Category</th>
            <th className={cx(thClass, "text-right")}>Target</th>
            <th className={cx(thClass, "text-right")}>Actual</th>
            <th className={cx(thClass, "w-45 text-left")}>Progress</th>
            <th className={cx(thClass, "text-left")}></th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((b) => (
            <tr key={b.id}>
              <td className={tdClass}>{b.category}</td>
              <td className={cx(tdClass, "text-right text-ink/70")}>{b.targetDisplay}</td>
              <td className={cx(tdClass, "text-right font-semibold")}>{b.actualDisplay}</td>
              <td className={tdClass}>
                <svg className="h-1.5 w-full bg-line-soft">
                  <rect width={b.pctWidth} height="100%" className={b.barClass} />
                </svg>
              </td>
              <td className={cx(tdClass, "whitespace-nowrap")}>
                {b.over && (
                  <span className="inline-flex items-center gap-1 border border-accent-800 px-1.75 py-0.5 text-11 text-accent-800">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                    Over by {b.overAmountDisplay}
                  </span>
                )}
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditBudget(b.id)} />
                <DeleteButton onClick={() => deleteBudget(b.id)} />
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
      <div className="px-4 py-2 text-11 text-ink/55">Targets scale to the selected date range ({monthsInRangeLabel}).</div>
    </Panel>
  );
}
