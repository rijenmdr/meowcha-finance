import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface SourceRow {
  id: string;
  name: string;
  usageLabel: string;
  inRangeDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function SourcesTable({ rows, empty }: { rows: SourceRow[]; empty: boolean }) {
  const { openEditSource, deleteSource } = useFinance();
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
            <th className={cx(thClass, "text-left")}>Source</th>
            <th className={cx(thClass, "text-left")}>Usage</th>
            <th className={cx(thClass, "text-right")}>Spent in range</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((x) => (
            <tr key={x.id}>
              <td className={cx(tdClass, "font-semibold")}>{x.name}</td>
              <td className={cx(tdClass, "whitespace-nowrap text-ink/60")}>{x.usageLabel}</td>
              <td className={cx(tdClass, "text-right font-semibold whitespace-nowrap")}>{x.inRangeDisplay}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditSource(x.id)} />
                <DeleteButton onClick={() => deleteSource(x.id)} />
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
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No sources yet. Add one, then pick it when recording an expense.</div>}
    </Panel>
  );
}
