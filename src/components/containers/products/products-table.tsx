"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useId, useMemo, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Panel } from "@/components/shared/panel";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { useLookups } from "@/hooks/use-lookups";
import { useUrlSearch } from "@/hooks/use-url-search";
import { useProductRows } from "@/hooks/mutations/use-product-mutations";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { useDataTable } from "@/hooks/use-data-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { DataTable } from "@/components/shared/data-table";

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
  category: string;
  variantCount: number;
  variants: VariantRow[];
  quantity: number;
  quantityDisplay: string;
  stockValue: number;
  stockValueDisplay: string;
  orderCount: number;
}


export function ProductsTable({ rows, empty, filterCategory }: { rows: ProductRow[]; empty: boolean; filterCategory: string }) {
  const router = useRouter();
  const { setSearch } = useUrlSearch();
  const openEditProduct = useCallback((id: string) => router.push(withDateFilter(`/products/${id}`)), [router]);
  const { productCategoryOptions } = useLookups();
  const categoryFilterId = useId();
  // The select shows the new choice while the filtered page loads.
  const [category, setOptimisticCategory] = useOptimistic(filterCategory);
  const { visibleRows, deleteProduct } = useProductRows(rows);

  function setCategory(next: string) {
    setSearch({ category: next === "all" ? null : next }, () => setOptimisticCategory(next));
  }
  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Product" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "category",
        header: ({ header }) => <SortableHeader header={header} title="Category" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.category}</span>,
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
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={categoryFilterId} className="text-11 text-ink/60">
            Category
          </Label>
          <NativeSelect id={categoryFilterId} value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
            <NativeSelectOption value="all">All categories</NativeSelectOption>
            {productCategoryOptions.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <Panel>
        <DataTable table={table} columnClasses={{ quantity: "text-right", stockValue: "text-right", actions: "text-right" }} />
        <TablePagination table={table} />
        {empty &&
          (filterCategory === "all" ? (
            <div className="px-4 py-6 text-13 text-ink/55">
              No products yet. Add a product, then a variant for each color, size or type, each with its own price.
            </div>
          ) : (
            <div className="px-4 py-6 text-13 text-ink/55">No products in this category.</div>
          ))}
      </Panel>
    </div>
  );
}
