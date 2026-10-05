import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Panel } from "./Panel";
import { DeleteButton, EditButton } from "./IconButton";
import { useFinance } from "@/lib/finance-context";
import { useDataTable } from "@/lib/use-data-table";
import { SortableHeader } from "./SortableHeader";
import { TablePagination } from "./TablePagination";

interface ProductRow {
  id: string;
  name: string;
  color: string;
  typeLabel: string;
  typeClass: string;
  quantity: number;
  quantityDisplay: string;
  quantityClass: string;
  price: number;
  priceDisplay: string;
  stockValue: number;
  stockValueDisplay: string;
}

const thClass = "border-b border-line px-4 py-2.5 text-10 tracking-[0.08em] text-ink/60 uppercase";
const tdClass = "border-b border-line-soft px-4 py-2.5";

export function ProductsTable({ rows, empty }: { rows: ProductRow[]; empty: boolean }) {
  const { openEditProduct, deleteProduct } = useFinance();
  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Product" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "color",
        header: ({ header }) => <SortableHeader header={header} title="Color" />,
        cell: ({ row }) => row.original.color,
      },
      {
        accessorKey: "typeLabel",
        header: ({ header }) => <SortableHeader header={header} title="Type" />,
        cell: ({ row }) => <span className={cx("inline-block px-2 py-0.5 text-11", row.original.typeClass)}>{row.original.typeLabel}</span>,
      },
      {
        accessorKey: "quantity",
        header: ({ header }) => <SortableHeader header={header} title="Quantity" align="right" />,
        cell: ({ row }) => <span className={cx("text-right whitespace-nowrap", row.original.quantityClass)}>{row.original.quantityDisplay}</span>,
      },
      {
        accessorKey: "price",
        header: ({ header }) => <SortableHeader header={header} title="Price" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap">{row.original.priceDisplay}</span>,
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
            <DeleteButton onClick={() => deleteProduct(row.original.id)} />
          </div>
        ),
      },
    ],
    [deleteProduct, openEditProduct],
  );
  const table = useDataTable({ data: rows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <table className="w-full text-13">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerClass = ["quantity", "price", "stockValue", "actions"].includes(header.column.id) ? "text-right" : "text-left";
                return (
                  <th key={header.id} className={cx(thClass, headerClass)}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const cellClass = ["quantity", "price", "stockValue", "actions"].includes(cell.column.id) ? "text-right" : "";
                return (
                  <td key={cell.id} className={cx(tdClass, cellClass)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination table={table} />
      {empty && (
        <div className="px-4 py-6 text-13 text-ink/55">
          No products yet. Add one row per color and paper type, each with its own price.
        </div>
      )}
    </Panel>
  );
}
