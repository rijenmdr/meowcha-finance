import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface CustomerRow {
  id: string;
  name: string;
  company: string;
  contact: string;
  inRangeDisplay: string;
  lifetimeDisplay: string;
  paymentsLabel: string;
  lastDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";
const subLineClass = "mt-0.5 text-11 text-ink/60";

export function CustomersTable({ rows, empty }: { rows: CustomerRow[]; empty: boolean }) {
  const { openEditCustomer, deleteCustomer } = useFinance();
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
            <th className={cx(thClass, "text-left")}>Customer</th>
            <th className={cx(thClass, "text-left")}>Contact</th>
            <th className={cx(thClass, "text-left")}>Last payment</th>
            <th className={cx(thClass, "text-right")}>In range</th>
            <th className={cx(thClass, "text-right")}>Lifetime</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((c) => (
            <tr key={c.id}>
              <td className={tdClass}>
                <div className="font-semibold">{c.name}</div>
                <div className={subLineClass}>{c.company}</div>
              </td>
              <td className={cx(tdClass, "text-ink/60")}>{c.contact}</td>
              <td className={cx(tdClass, "whitespace-nowrap text-ink/60")}>{c.lastDisplay}</td>
              <td className={cx(tdClass, "text-right font-semibold whitespace-nowrap text-accent-600")}>{c.inRangeDisplay}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <div>{c.lifetimeDisplay}</div>
                <div className={subLineClass}>{c.paymentsLabel}</div>
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditCustomer(c.id)} />
                <DeleteButton onClick={() => deleteCustomer(c.id)} />
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No customers yet. Add one, then pick them when recording income.</div>}
    </Panel>
  );
}
