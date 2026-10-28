"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ProductVariantsState } from "@/hooks/use-product-form";
import { linkButtonClass, removeButtonClass } from "./product-option-fields";
import { ProductVariantValueInput } from "./product-variant-value-input";

// One row per option combination, each with its own stock and price.
export function ProductVariantRows({ optionNames, variants }: { optionNames: string[]; variants: ProductVariantsState }) {
  return (
    <div>
      <div className="mb-1.25 flex gap-2 pr-9">
        {optionNames.map((n, i) => (
          <span key={i} className="min-w-32 flex-1 truncate text-12 text-ink/70">
            {n.trim() || `Option ${i + 1}`}
          </span>
        ))}
        <span className="w-24 text-12 text-ink/70">Qty</span>
        <span className="w-32 text-12 text-ink/70">Price (Rs)</span>
      </div>
      <div className="flex flex-col gap-2">
        {variants.rows.map((variant) => (
          <div key={variant.id} className="flex items-center gap-2">
            {variant.values.map((value, i) => (
              <ProductVariantValueInput
                key={i}
                optionName={optionNames[i]}
                label={optionNames[i] || `Option ${i + 1}`}
                value={value}
                onChange={(next) => variants.setValue(variant.id, i, next)}
              />
            ))}
            <Input
              type="number"
              aria-label="Quantity"
              min="0"
              step="1"
              value={variant.quantity}
              onChange={(e) => variants.update(variant.id, { quantity: e.target.value })}
              required
              className="w-24"
            />
            <Input
              type="number"
              aria-label="Price"
              min="0"
              step="0.01"
              value={variant.price}
              onChange={(e) => variants.update(variant.id, { price: e.target.value })}
              required
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove variant"
              disabled={variants.rows.length === 1}
              onClick={() => variants.remove(variant.id)}
              className={cn(removeButtonClass, "disabled:opacity-30")}
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="link" onClick={variants.add} className={cn(linkButtonClass, "mt-2")}>
        + Add variant
      </Button>
    </div>
  );
}
