import { cx } from "@/lib/cx";
import type { Header } from "@tanstack/react-table";

const sortButtonClass = "flex w-full cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-inherit";

export function SortableHeader<TData>({
  header,
  title,
  align = "left",
}: {
  header: Header<TData, unknown>;
  title: string;
  align?: "left" | "right";
}) {
  const direction = header.column.getIsSorted();
  const justifyClass = align === "right" ? "justify-end" : "justify-start";

  return (
    <button type="button" onClick={() => header.column.toggleSorting(direction === "asc")} className={cx(sortButtonClass, justifyClass)}>
      <span>{title}</span>
      <span className="text-11 text-ink/45">{direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}</span>
    </button>
  );
}