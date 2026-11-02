"use client";

import { SearchCombobox } from "@/components/ui/search-combobox";
import { searchVariantsAction } from "@/lib/actions/product";
import { fmtMoney } from "@/lib/utils/format-money";
import type { VariantOption } from "@/models/product";

// Picks a product variant by searching on the server. excludeIds are variants
// already on the order; outOfStockOnly is for requests.
export function ProductVariantPicker({
  value,
  onChange,
  excludeIds,
  outOfStockOnly,
  disabled,
}: {
  value: VariantOption | null;
  onChange: (variant: VariantOption | null) => void;
  excludeIds: string[];
  outOfStockOnly: boolean;
  disabled?: boolean;
}) {
  return (
    <SearchCombobox
      value={value}
      onChange={onChange}
      search={(text, page) => searchVariantsAction(text, page, excludeIds, outOfStockOnly)}
      getKey={(variant) => variant.id}
      renderValue={(variant) => variant.label}
      renderOption={(variant) => (
        <>
          <div className="truncate font-semibold">{variant.label}</div>
          <div className="text-12 text-ink/60">
            {fmtMoney(variant.price)} · {variant.quantity > 0 ? `${variant.quantity} in stock` : "out of stock"}
          </div>
        </>
      )}
      placeholder="Choose a product…"
      searchPlaceholder="Search product or option…"
      emptyText={outOfStockOnly ? "No out-of-stock products found." : "No products found."}
      required
      disabled={disabled}
    />
  );
}
