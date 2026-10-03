import { useId } from "react";

interface TablePaginationProps {
    totalRows: number;
    startIndex: number;
    endIndex: number;
    page: number;
    totalPages: number;
    pageSize: number;
    canPreviousPage: boolean;
    canNextPage: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onRowsPerPageChange: (nextPageSize: number) => void;
}

const buttonClass =
    "min-w-14 cursor-pointer border border-line px-2 py-1 text-11 text-ink transition-colors hover:border-accent-400 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-45";
const selectClass = "min-h-7 border border-line bg-surface px-2 py-1 text-11 text-ink";

export function TablePagination({
    totalRows,
    startIndex,
    endIndex,
    page,
    totalPages,
    pageSize,
    canPreviousPage,
    canNextPage,
    onPreviousPage,
    onNextPage,
    onRowsPerPageChange,
}: TablePaginationProps) {
    const selectId = useId();

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
                    onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                    className={selectClass}
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
                <button type="button" onClick={onPreviousPage} disabled={!canPreviousPage} className={buttonClass}>
                    Prev
                </button>
                <div className="min-w-20 text-center text-ink/70">
                    {page} / {totalPages}
                </div>
                <button type="button" onClick={onNextPage} disabled={!canNextPage} className={buttonClass}>
                    Next
                </button>
            </div>
        </div>
    );
}
