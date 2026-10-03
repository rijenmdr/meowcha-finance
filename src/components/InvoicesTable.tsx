import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface InvoiceRow {
  id: string;
  client: string;
  issueDisplay: string;
  dueDisplay: string;
  amountDisplay: string;
  status: string;
  statusClass: string;
  showMarkPaid: boolean;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const { openEditInvoice, deleteInvoice, markInvoicePaid } = useFinance();
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
            <th className={cx(thClass, "text-left")}>Client</th>
            <th className={cx(thClass, "text-left")}>Issued</th>
            <th className={cx(thClass, "text-left")}>Due</th>
            <th className={cx(thClass, "text-right")}>Amount</th>
            <th className={cx(thClass, "text-left")}>Status</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((inv) => (
            <tr key={inv.id}>
              <td className={tdClass}>{inv.client}</td>
              <td className={cx(tdClass, "text-ink/60")}>{inv.issueDisplay}</td>
              <td className={cx(tdClass, "text-ink/60")}>{inv.dueDisplay}</td>
              <td className={cx(tdClass, "text-right font-semibold")}>{inv.amountDisplay}</td>
              <td className={tdClass}>
                <span className={cx("px-2 py-0.75 text-11", inv.statusClass)}>{inv.status}</span>
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                {inv.showMarkPaid && (
                  <button
                    type="button"
                    onClick={() => markInvoicePaid(inv.id)}
                    className="cursor-pointer border-none bg-transparent py-0 pr-2 pl-0 font-condensed text-12 font-semibold text-accent-500"
                  >
                    Mark paid
                  </button>
                )}
                <EditButton onClick={() => openEditInvoice(inv.id)} />
                <DeleteButton onClick={() => deleteInvoice(inv.id)} />
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
    </Panel>
  );
}
