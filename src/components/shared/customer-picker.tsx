"use client";

import { useState } from "react";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { searchCustomersAction } from "@/lib/actions/customer";
import type { CustomerOption } from "@/models/customer";
import type { NamedRef } from "@/models/picker";

// Picks a customer by searching on the server. Submits the id as `name`.
// initial is the customer already on the record being edited.
export function CustomerPicker({
  id,
  name,
  initial,
  required,
  disabled,
}: {
  id?: string;
  name: string;
  initial?: NamedRef | null;
  required?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<CustomerOption | null>(initial ? { ...initial, company: "" } : null);

  return (
    <SearchCombobox
      id={id}
      name={name}
      value={value}
      onChange={setValue}
      search={searchCustomersAction}
      getKey={(customer) => customer.id}
      renderValue={(customer) => customer.name}
      renderOption={(customer) => (
        <>
          <div className="font-semibold">{customer.name}</div>
          {customer.company && <div className="truncate text-12 text-ink/60">{customer.company}</div>}
        </>
      )}
      placeholder="Choose a customer…"
      searchPlaceholder="Search name, company or phone…"
      emptyText="No customers found."
      noneLabel={required ? undefined : "No customer"}
      required={required}
      disabled={disabled}
    />
  );
}
