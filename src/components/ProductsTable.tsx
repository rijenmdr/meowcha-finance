import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { usePagination } from "@/lib/use-pagination";
import { TablePagination } from "./TablePagination";

interface ProductRow {
  id: string;
  name: string;
  color: string;
  typeLabel: string;
  typeClass: string;
  quantityDisplay: string;
  quantityClass: string;
  priceDisplay: string;
  stockValueDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function ProductsTable({ rows, empty }: { rows: ProductRow[]; empty: boolean }) {
  const { openEditProduct, deleteProduct } = useFinance();
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
            <th className={cx(thClass, "text-left")}>Product</th>
            <th className={cx(thClass, "text-left")}>Color</th>
            <th className={cx(thClass, "text-left")}>Type</th>
            <th className={cx(thClass, "text-right")}>Quantity</th>
            <th className={cx(thClass, "text-right")}>Price</th>
            <th className={cx(thClass, "text-right")}>Stock value</th>
            <th className={cx(thClass, "text-right")}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((p) => (
            <tr key={p.id}>
              <td className={cx(tdClass, "font-semibold")}>{p.name}</td>
              <td className={tdClass}>{p.color}</td>
              <td className={tdClass}>
                <span className={cx("inline-block px-2 py-0.5 text-11", p.typeClass)}>{p.typeLabel}</span>
              </td>
              <td className={cx(tdClass, "text-right whitespace-nowrap", p.quantityClass)}>{p.quantityDisplay}</td>
              <td className={cx(tdClass, "text-right font-semibold whitespace-nowrap")}>{p.priceDisplay}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap text-ink/60")}>{p.stockValueDisplay}</td>
              <td className={cx(tdClass, "text-right whitespace-nowrap")}>
                <EditButton onClick={() => openEditProduct(p.id)} />
                <DeleteButton onClick={() => deleteProduct(p.id)} />
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
      {empty && (
        <div className="px-4 py-6 text-13 text-ink/55">
          No products yet. Add one row per color and paper type, each with its own price.
        </div>
      )}
    </Panel>
  );
}
