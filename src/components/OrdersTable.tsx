import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface OrderRow {
  id: string;
  orderNumber: string;
  dateDisplay: string;
  customer: string;
  deliveryLocation: string | null;
  deliveryProvider: string | null;
  paymentMethod: string | null;
  itemsSummary: string;
  unitsLabel: string;
  totalDisplay: string;
  deliveryDisplay: string | null;
  paidDisplay: string;
  dueDisplay: string | null;
  status: string;
  statusClass: string;
  paymentStatus: string;
  paymentStatusClass: string;
  nextStepLabel: string | null;
  showRecordPayment: boolean;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5 align-top";
const pillClass = "inline-block px-2 py-0.75 text-11 whitespace-nowrap";
const textButtonClass = "cursor-pointer border-none bg-transparent p-0 font-condensed text-12 font-semibold text-accent-500";

export function OrdersTable({ rows, empty }: { rows: OrderRow[]; empty: boolean }) {
  const { openEditOrder, deleteOrder, advanceOrderStatus, openRecordPayment } = useFinance();
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
            <th className={cx(thClass, "text-left")}>Order</th>
            <th className={cx(thClass, "text-left")}>Customer</th>
            <th className={cx(thClass, "text-left")}>Items</th>
            <th className={cx(thClass, "text-right")}>Total</th>
            <th className={cx(thClass, "text-right")}>Paid</th>
            <th className={cx(thClass, "text-left")}>Status</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((o) => (
            <tr key={o.id}>
              <td className={cx(tdClass, "whitespace-nowrap")}>
                <div className="font-semibold">{o.orderNumber}</div>
                <div className="text-11 text-ink/60">{o.dateDisplay}</div>
              </td>
              <td className={tdClass}>
                <div>{o.customer}</div>
                {o.deliveryLocation && <div className="text-11 text-ink/60">Deliver to: {o.deliveryLocation}</div>}
                {o.deliveryProvider && <div className="text-11 text-ink/60">Delivery: {o.deliveryProvider}</div>}
                {o.paymentMethod && <div className="text-11 text-ink/60">Pays by {o.paymentMethod}</div>}
              </td>
              <td className={tdClass}>
                <div>{o.itemsSummary}</div>
                <div className="text-11 text-ink/60">{o.unitsLabel}</div>
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <div className="font-semibold">{o.totalDisplay}</div>
                {o.deliveryDisplay && <div className="text-11 text-ink/60">{o.deliveryDisplay}</div>}
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <div>{o.paidDisplay}</div>
                {o.dueDisplay && <div className="text-11 text-accent-800">{o.dueDisplay}</div>}
              </td>
              <td className={tdClass}>
                <div className="flex flex-col items-start gap-1">
                  <span className={cx(pillClass, o.statusClass)}>{o.status}</span>
                  <span className={cx(pillClass, o.paymentStatusClass)}>{o.paymentStatus}</span>
                </div>
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <div className="flex items-center justify-end gap-2.5">
                  <div className="flex flex-col items-end gap-1">
                    {o.nextStepLabel && (
                      <button type="button" onClick={() => advanceOrderStatus(o.id)} className={textButtonClass}>
                        {o.nextStepLabel}
                      </button>
                    )}
                    {o.showRecordPayment && (
                      <button type="button" onClick={() => openRecordPayment(o.id)} className={textButtonClass}>
                        Record payment
                      </button>
                    )}
                  </div>
                  <div>
                    <EditButton onClick={() => openEditOrder(o.id)} />
                    <DeleteButton onClick={() => deleteOrder(o.id)} />
                  </div>
                </div>
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No orders in this date range.</div>}
    </Panel>
  );
}
