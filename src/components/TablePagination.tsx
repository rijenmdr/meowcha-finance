import { useId } from "react";
import type { Table } from "@tanstack/react-table";

interface TablePaginationProps<TData> {
    table: Table<TData>;
}

const buttonClass =
    "min-w-14 cursor-pointer border border-line px-2 py-1 text-11 text-ink transition-colors hover:border-accent-400 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-45";
const selectClass = "min-h-7 border border-line bg-surface px-2 py-1 text-11 text-ink";

export function TablePagination<TData>({ table }: TablePaginationProps<TData>) {
    const selectId = useId();

    const totalRows = table.getRowCount();
    const pagination = table.getState().pagination;
    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;
    const totalPages = table.getPageCount();
    const startIndex = pagination.pageIndex * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const canPreviousPage = table.getCanPreviousPage();
    const canNextPage = table.getCanNextPage();

    if (totalRows === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 text-11 text-ink/60">
            <div>
                {startIndex + 1}-{endIndex} of {totalRows}
            </div>
            <div className="ml-auto flex items-center gap-2">
                <label htmlFor={selectId}>Rows</label>
                <select
                    id={selectId}
                    value={pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    className={selectClass}
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
                <button type="button" onClick={() => table.previousPage()} disabled={!canPreviousPage} className={buttonClass}>
                    Prev
                </button>
                <div className="min-w-20 text-center text-ink/70">
                    {page} / {totalPages}
                </div>
                <button type="button" onClick={() => table.nextPage()} disabled={!canNextPage} className={buttonClass}>
                    Next
                </button>
            </div>
        </div>
    );
}
