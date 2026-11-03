"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProductVariantPicker } from "@/components/shared/product-variant-picker";
import { cn } from "@/lib/utils/cn";
import type { ItemDraft, OrderItemsState } from "@/hooks/use-order-items";
import { OrderToMake } from "./order-to-make";

const itemGridClass = "grid grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_1.75rem] gap-2";
const rowNoteClass = "col-span-4 -mt-1 text-11";

// Explains how the variant search works. Null when there's nothing to say.
function pickerHint(tracksStock: boolean, isRequest: boolean): string | null {
  if (tracksStock) return "Anything stock can't cover is saved as a request linked to this order, to make.";
  if (isRequest) return "Only out-of-stock variants are listed. For something in stock, create an order instead.";
  return null;
}

export function OrderItemsFields({
  orderItems,
  tracksStock,
  isRequest,
}: {
  orderItems: OrderItemsState;
  tracksStock: boolean;
  isRequest: boolean;
}) {
  const { items, shortfallOf, updateItem, addItem, removeItem } = orderItems;
  const hint = pickerHint(tracksStock, isRequest);

  function renderItem(item: ItemDraft) {
    // Rows merged from a request may repeat a variant; the order's own rows may not.
    const takenElsewhere = items.flatMap((other) => (other.id !== item.id && !other.fromRequestNumber && !other.isCustom && other.variant ? [other.variant.id] : []));
    const shortfall = shortfallOf(item);
    const quantity = parseInt(item.quantity, 10) || 0;

    return (
      <div key={item.id} className={itemGridClass}>
        <div className="flex min-w-0 flex-col items-start gap-1">
          {item.isCustom ? (
            <>
              <Input
                aria-label="Item name"
                placeholder="Item name"
                maxLength={200}
                value={item.itemName}
                onChange={(event) => updateItem(item.id, { itemName: event.target.value })}
                required
                disabled={!!item.fromRequestNumber}
              />
              <Input
                aria-label="Item details"
                placeholder="Variant or details (optional)"
                maxLength={500}
                value={item.itemDetails}
                onChange={(event) => updateItem(item.id, { itemDetails: event.target.value })}
                disabled={!!item.fromRequestNumber}
              />
            </>
          ) : (
            <ProductVariantPicker
              value={item.variant}
              onChange={(variant) => updateItem(item.id, { variant })}
              excludeIds={item.fromRequestNumber ? [] : takenElsewhere}
              outOfStockOnly={isRequest}
              disabled={!!item.fromRequestNumber}
            />
          )}
          {!item.fromRequestNumber && (
            <Button
              type="button"
              variant="link"
              onClick={() => updateItem(item.id, item.isCustom ? { isCustom: false } : { isCustom: true, variant: null })}
              className="h-auto px-0 py-0 text-11"
            >
              {item.isCustom ? "Choose catalog product" : "Enter custom item"}
            </Button>
          )}
        </div>
        <Input
          type="number"
          aria-label="Quantity"
          min="1"
          step="1"
          value={item.quantity}
          onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
          required
        />
        <Input
          type="number"
          aria-label="Sub-total"
          min="0"
          step="0.01"
          value={item.subTotal}
          onChange={(event) => updateItem(item.id, { subTotal: event.target.value })}
          required
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Remove item"
          onClick={() => removeItem(item.id)}
          disabled={items.length === 1}
          className="disabled:opacity-40"
        >
          <XIcon strokeWidth={1.5} className="size-3" />
        </Button>
        {item.fromRequestNumber && <div className={cn(rowNoteClass, "text-accent-600")}>Made to order · from request {item.fromRequestNumber}</div>}
        {shortfall > 0 && (
          <div className={cn(rowNoteClass, "text-accent-800")}>
            {quantity - shortfall} from stock · {shortfall} to make
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={cn(itemGridClass, "mb-1.25")}>
        <span className="text-12 text-ink/70">Item</span>
        <span className="text-12 text-ink/70">Qty</span>
        <span className="text-12 text-ink/70">Sub-total (Rs)</span>
        <span />
      </div>
      <div className="flex flex-col gap-2">{items.map(renderItem)}</div>
      <Button type="button" variant="link" onClick={addItem} className="mt-2">
        + Add item
      </Button>
      {hint && <FieldDescription className="mt-1">{hint}</FieldDescription>}
      <OrderToMake items={orderItems.toMake} />
    </div>
  );
}
