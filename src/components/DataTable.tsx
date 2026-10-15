import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// columnClasses apply to a column's header and cells (alignment, width);
// cellClasses and cellClassName only to body cells.
export function DataTable<TData>({
  table,
  columnClasses = {},
  cellClasses = {},
  cellClassName,
}: {
  table: TanStackTable<TData>;
  columnClasses?: Partial<Record<string, string>>;
  cellClasses?: Partial<Record<string, string>>;
  cellClassName?: string;
}) {
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={columnClasses[header.column.id]}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      {/* Every row keeps its bottom rule, the last one included, as the tables always have. */}
      <TableBody className="[&_tr:last-child]:border-b">
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} className={cn(cellClassName, columnClasses[cell.column.id], cellClasses[cell.column.id])}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
