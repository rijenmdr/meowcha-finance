import { useMemo, useState } from "react";

export function usePagination<T>(rows: T[], initialPageSize = 10) {
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [page, setPage] = useState(1);

    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);

    const pageRows = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex]);

    const goToPage = (nextPage: number) => {
        setPage(Math.max(1, Math.min(totalPages, nextPage)));
    };

    const setRowsPerPage = (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
    };

    return {
        pageRows,
        totalRows,
        page: currentPage,
        pageSize,
        totalPages,
        startIndex,
        endIndex,
        canPreviousPage: currentPage > 1,
        canNextPage: currentPage < totalPages,
        goToPage,
        previousPage: () => goToPage(currentPage - 1),
        nextPage: () => goToPage(currentPage + 1),
        setRowsPerPage,
    };
}
