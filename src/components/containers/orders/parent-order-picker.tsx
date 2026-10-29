"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useParentOrderSearch } from "@/hooks/queries/use-parent-order-search";
import { cn } from "@/lib/utils/cn";
import { fmtDate } from "@/lib/utils/format-date";
import type { ParentOrder } from "@/models/order";

const NO_PARENT = "__none";
const LOAD_MORE = "__more";

// Links a new request to a processing order. The search runs on the server
// (shouldFilter off), a page at a time.
export function ParentOrderPicker({ id, value, onChange }: { id: string; value: ParentOrder | null; onChange: (order: ParentOrder | null) => void }) {
  const [open, setOpen] = useState(false);
  const picker = useParentOrderSearch();

  function openChange(next: boolean) {
    setOpen(next);
    if (next) picker.start();
  }

  function choose(order: ParentOrder | null) {
    onChange(order);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-sans font-normal">
          <span className="truncate">{value ? `${value.orderNumber} · ${value.customerName}` : "No parent order"}</span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        {/* <Command shouldFilter={false}>
          <CommandInput placeholder="Search order number or customer…" value={picker.search} onValueChange={picker.changeSearch} />
          <CommandList>
            {!picker.loading && !picker.error && <CommandEmpty>No processing orders found.</CommandEmpty>}
            {picker.error && <div className="px-3 py-4 text-13 text-error">{picker.error}</div>}
            <CommandGroup>
              {value && (
                <CommandItem value={NO_PARENT} onSelect={() => choose(null)}>
                  No parent order
                </CommandItem>
              )}
              {picker.rows.map((order) => (
                <CommandItem key={order.id} value={order.id} onSelect={() => choose(order)}>
                  <div className="min-w-0">
                    <div className="font-semibold">{order.orderNumber}</div>
                    <div className="truncate text-12 text-ink/60">
                      {order.customerName} · {fmtDate(order.orderDate)}
                    </div>
                  </div>
                  <CheckIcon className={cn("ml-auto", value?.id === order.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
              {picker.hasMore && (
                <CommandItem value={LOAD_MORE} onSelect={picker.loadMore} className="text-accent-600">
                  Load more…
                </CommandItem>
              )}
            </CommandGroup>
            {picker.loading && <div className="px-3 py-2 text-12 text-ink/60">Searching…</div>}
          </CommandList>
        </Command> */}
      </PopoverContent>
    </Popover>
  );
}
