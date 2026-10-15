"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance, useOptimisticRows } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";
import { DataTable } from "./DataTable";

interface VariantRow {
  id: string;
  label: string;
  quantityDisplay: string;
  quantityClass: string;
  priceDisplay: string;
}

interface ProductRow {
  id: string;
  name: string;
  variantCount: number;
  variants: VariantRow[];
  quantity: number;
  quantityDisplay: string;
  stockValue: number;
  stockValueDisplay: string;
  orderCount: number;
}


export function ProductsTable({ rows, empty }: { rows: ProductRow[]; empty: boolean }) {
  const { openEditProduct, deleteProduct } = useFinance();
  const visibleRows = useOptimisticRows(rows);
  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Product" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: "variants",
        accessorKey: "variantCount",
        header: ({ header }) => <SortableHeader header={header} title="Variants" />,
        cell: ({ row }) => (
          <ul className="flex flex-col gap-1">
            {row.original.variants.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-12">
                <span className="inline-block bg-mist px-2 py-0.5 text-graphite">{v.label}</span>
                <span className={v.quantityClass}>{v.quantityDisplay} in stock</span>
                <span className="text-ink/60">· {v.priceDisplay}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        accessorKey: "quantity",
        header: ({ header }) => <SortableHeader header={header} title="Quantity" align="right" />,
        cell: ({ row }) => <span className="text-right whitespace-nowrap">{row.original.quantityDisplay}</span>,
      },
      {
        accessorKey: "stockValue",
        header: ({ header }) => <SortableHeader header={header} title="Stock value" align="right" />,
        cell: ({ row }) => <span className="text-right whitespace-nowrap text-ink/60">{row.original.stockValueDisplay}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openEditProduct(row.original.id)} />
            <DeleteButton onClick={() => deleteProduct(row.original)} />
          </div>
        ),
      },
    ],
    [deleteProduct, openEditProduct],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ quantity: "text-right", stockValue: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && (
        <div className="px-4 py-6 text-13 text-ink/55">
          No products yet. Add a product, then a variant for each color, size or type, each with its own price.
        </div>
      )}
    </Panel>
  );
}
