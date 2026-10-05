import { useState } from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";

interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  initialPageSize?: number;
  initialSorting?: SortingState;
}

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