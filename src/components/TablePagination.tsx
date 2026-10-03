import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const buttonClass = "min-w-14 rounded-none border-line bg-transparent text-11 text-ink hover:border-accent-400 hover:text-accent-700";

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
                <Select value={String(pageSize)} onValueChange={(value) => onRowsPerPageChange(Number(value))}>
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
                <Button type="button" variant="outline" size="sm" onClick={onPreviousPage} disabled={!canPreviousPage} className={buttonClass}>
                    Prev
                </Button>
                <div className="min-w-20 text-center text-ink/70">
                    {page} / {totalPages}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onNextPage} disabled={!canNextPage} className={buttonClass}>
                    Next
                </Button>
            </div>
        </div>
    );
}
