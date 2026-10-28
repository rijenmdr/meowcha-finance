import { useState } from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useUrlSearch } from "./use-url-search";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import type { TableQuery } from "@/lib/helpers/table-params";

interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  initialPageSize?: number;
  initialSorting?: SortingState;
}

// For short lists that arrive whole (customers, categories…): sorts and pages in the browser.
export function useDataTable<TData>({
  data,
  columns,
  initialPageSize = 10,
  initialSorting = [],
}: UseDataTableOptions<TData>) {
  const inferredDateSort = columns
    .map((column) => {
      const accessorKey = (column as { accessorKey?: unknown }).accessorKey;
      return typeof accessorKey === "string" ? accessorKey : null;
    })
    .find((key) => key !== null && /(date|Date|createdAt|updatedAt)$/.test(key));

  const defaultSorting = initialSorting.length > 0
    ? initialSorting
    : inferredDateSort
      ? [{ id: inferredDateSort, desc: true }]
      : [];

  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // TanStack table instance APIs are intentionally function-heavy and are not React-Compiler memo-safe.
  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
}

interface UseServerDataTableOptions<TData> {
  data: TData[]; // the current page only
  columns: ColumnDef<TData>[];
  rowCount: number; // matches across every page
  query: TableQuery; // the page and sort the server used, from the URL
}

// For lists that grow with use (transactions, orders, invoices): the server
// sorts and pages. Sorting or paging writes the URL, which re-renders the page.
export function useServerDataTable<TData>({ data, columns, rowCount, query }: UseServerDataTableOptions<TData>) {
  const { setSearch } = useUrlSearch();
  const sorting: SortingState = [{ id: query.sort, desc: query.desc }];
  const pagination: PaginationState = { pageIndex: query.page - 1, pageSize: query.pageSize };
  const resolve = <T,>(updater: Updater<T>, current: T): T =>
    typeof updater === "function" ? (updater as (old: T) => T)(current) : updater;

  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data,
    columns,
    rowCount,
    state: { sorting, pagination },
    manualSorting: true,
    manualPagination: true,
    onSortingChange: (updater) => {
      const next = resolve(updater, sorting)[0];
      // A new order starts again from the first page.
      setSearch({ sort: next?.id ?? null, dir: next ? (next.desc ? "desc" : "asc") : null, page: null });
    },
    onPaginationChange: (updater) => {
      const next = resolve(updater, pagination);
      const resized = next.pageSize !== pagination.pageSize;
      setSearch({
        page: resized || next.pageIndex === 0 ? null : String(next.pageIndex + 1),
        size: next.pageSize === DEFAULT_PAGE_SIZE ? null : String(next.pageSize),
      });
    },
    getCoreRowModel: getCoreRowModel(),
  });
}
