"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_PRODUCT_OPTIONS } from "@/constants/product";
import { useLookups } from "@/hooks/use-lookups";
import type { ProductOptionsState } from "@/hooks/use-product-form";

export const linkButtonClass = "self-start text-accent-600";
export const removeButtonClass = "text-ink/60 hover:bg-transparent hover:text-error";

// The names of what varies between versions (Color, Type…).
export function ProductOptionFields({ options }: { options: ProductOptionsState }) {
  const { productOptionNameOptions } = useLookups();

  return (
    <Field>
      <FieldLabel>Options</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        {options.names.map((optionName, i) => (
          <div key={i} className="flex w-40 items-center">
            <Input
              type="text"
              aria-label={`Option ${i + 1} name`}
              list="product-option-names"
              value={optionName}
              onChange={(e) => options.rename(i, e.target.value)}
              required
              pattern=".*\S.*"
              maxLength={50}
            />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove option" onClick={() => options.remove(i)} className={removeButtonClass}>
              <XIcon />
            </Button>
          </div>
        ))}
        {options.names.length < MAX_PRODUCT_OPTIONS && (
          <Button type="button" variant="link" onClick={options.add} className={linkButtonClass}>
            + Add option
          </Button>
        )}
      </div>
      <datalist id="product-option-names">
        {productOptionNameOptions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <FieldDescription>What varies between versions, such as Color, Type or Size.</FieldDescription>
    </Field>
  );
}
