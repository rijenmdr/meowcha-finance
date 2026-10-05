import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Table } from "@tanstack/react-table";

interface TablePaginationProps<TData> {
    table: Table<TData>;
}

const buttonClass = "min-w-14 rounded-none border-line bg-transparent text-11 text-ink hover:border-accent-400 hover:text-accent-700";

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
                <Select value={String(pageSize)} onValueChange={(value: string | null) => table.setPageSize(Number(value))}>
                    <SelectTrigger id={selectId} size="sm" className="w-18 rounded-none border-line bg-surface text-11 text-ink">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-line bg-canvas text-ink ring-0">
                        <SelectGroup>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!canPreviousPage} className={buttonClass}>
                    Prev
                </Button>
                <div className="min-w-20 text-center text-ink/70">
                    {page} / {totalPages}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!canNextPage} className={buttonClass}>
                    Next
                </Button>
            </div >
        </div >
    );
}
