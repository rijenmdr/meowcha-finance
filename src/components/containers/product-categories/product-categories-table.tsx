"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "@/components/shared/panel";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { useDialogStore } from "@/stores/use-dialog-store";
import { useProductCategoryRows } from "@/hooks/mutations/use-product-category-mutations";
import { useDataTable } from "@/hooks/use-data-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { DataTable } from "@/components/shared/data-table";

interface ProductCategoryRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
}

export function ProductCategoriesTable({ rows, empty }: { rows: ProductCategoryRow[]; empty: boolean }) {
  const openDialog = useDialogStore((state) => state.open);
  const { visibleRows, deleteProductCategory } = useProductCategoryRows(rows);
  const columns = useMemo<ColumnDef<ProductCategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Category" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Products" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openDialog("productCategory", { editId: row.original.id })} />
            <DeleteButton onClick={() => deleteProductCategory(row.original)} />
          </div>
        ),
      },
    ],
    [deleteProductCategory, openDialog],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No product categories yet. Add one, then pick it on each product.</div>}
    </Panel>
  );
}
