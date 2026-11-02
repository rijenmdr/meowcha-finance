"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePagedSearch } from "@/hooks/queries/use-paged-search";
import { cn } from "@/lib/utils/cn";
import type { PickerPage } from "@/models/picker";

const NONE_VALUE = "__none";
const LOAD_MORE_VALUE = "__more";

interface SearchComboboxProps<T> {
  id?: string;
  // Submitted with the form as the picked row's key; empty when nothing is picked.
  name?: string;
  value: T | null;
  onChange: (row: T | null) => void;
  // Fetches one page from the server, so the whole list never loads at once.
  search: (text: string, page: number) => Promise<PickerPage<T>>;
  getKey: (row: T) => string;
  renderOption: (row: T) => ReactNode;
  renderValue: (row: T) => ReactNode;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  // When set, the field is optional and this clears it.
  noneLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchCombobox<T>({
  id,
  name,
  value,
  onChange,
  search,
  getKey,
  renderOption,
  renderValue,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  noneLabel,
  required,
  disabled,
  className,
}: SearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const picker = usePagedSearch(search);
  const key = value ? getKey(value) : "";

  function openChange(next: boolean) {
    setOpen(next);
    if (next) picker.start();
  }

  function choose(row: T | null) {
    onChange(row);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-sans font-normal"
          >
            <span className={cn("truncate", !value && !noneLabel && "text-ink/50")}>{value ? renderValue(value) : (noneLabel ?? placeholder)}</span>
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        {/* A text input stands in for the value so the form submits it and `required` blocks an empty pick. */}
        <input
          name={name}
          value={key}
          required={required}
          disabled={disabled}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={picker.text} onValueChange={picker.changeText} />
          <CommandList>
            {!picker.loading && !picker.error && <CommandEmpty>{emptyText}</CommandEmpty>}
            {picker.error && <div className="px-3 py-4 text-13 text-error">{picker.error}</div>}
            <CommandGroup>
              {noneLabel && value && (
                <CommandItem value={NONE_VALUE} onSelect={() => choose(null)}>
                  {noneLabel}
                </CommandItem>
              )}
              {picker.rows.map((row) => (
                <CommandItem key={getKey(row)} value={getKey(row)} onSelect={() => choose(row)}>
                  <div className="min-w-0">{renderOption(row)}</div>
                  <CheckIcon className={cn("ml-auto", key === getKey(row) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
              {picker.hasMore && (
                <CommandItem value={LOAD_MORE_VALUE} onSelect={picker.loadMore} className="text-accent-600">
                  Load more…
                </CommandItem>
              )}
            </CommandGroup>
            {picker.loading && <div className="px-3 py-2 text-12 text-ink/60">Searching…</div>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
