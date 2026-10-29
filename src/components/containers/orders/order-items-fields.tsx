"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils/cn";
import { fmtMoney } from "@/lib/utils/format-money";
import type { ItemDraft, OrderItemsState } from "@/hooks/use-order-items";
import { OrderToMake } from "./order-to-make";

const itemGridClass = "grid grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_1.75rem] items-center gap-2";
const rowNoteClass = "col-span-4 -mt-1 text-11";

// Explains how the variant list works. Null when there's nothing to say.
function pickerHint(tracksStock: boolean, isRequest: boolean, selectableCount: number): string | null {
  if (tracksStock) return "Anything stock can't cover is saved as a request linked to this order, to make.";
  if (isRequest) {
    const listed = selectableCount === 0 ? "Nothing is out of stock." : "Only out-of-stock variants are listed.";
    return `${listed} For something in stock, create an order instead.`;
  }
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
  const { items, productChoices, canPick, selectableCount, ownItemCount, hasProducts, shortfallOf, updateItem, addItem, removeItem } = orderItems;
  const hint = pickerHint(tracksStock, isRequest, selectableCount);

  function renderItem(item: ItemDraft) {
    // Rows merged from a request may repeat a variant; the order's own rows may not.
    const takenElsewhere = new Set(items.filter((other) => other.id !== item.id && !other.fromRequestNumber).map((other) => other.productId));
    const choices = productChoices.filter(
      (product) => product.id === item.productId || item.fromRequestNumber || (!takenElsewhere.has(product.id) && canPick(product)),
    );
    const shortfall = shortfallOf(item);
    const quantity = parseInt(item.quantity, 10) || 0;

    return (
      <div key={item.id} className={itemGridClass}>
        <NativeSelect
          aria-label="Product"
          value={item.productId}
          onChange={(event) => updateItem(item.id, { productId: event.target.value })}
          disabled={!!item.fromRequestNumber}
          required
        >
          <NativeSelectOption value="">Choose a product…</NativeSelectOption>
          {choices.map((product) => (
            <NativeSelectOption key={product.id} value={product.id}>
              {product.label} — {fmtMoney(product.price)} · {product.stockLabel}
            </NativeSelectOption>
          ))}
        </NativeSelect>
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
        <span className="text-12 text-ink/70">Product</span>
        <span className="text-12 text-ink/70">Qty</span>
        <span className="text-12 text-ink/70">Sub-total (Rs)</span>
        <span />
      </div>
      <div className="flex flex-col gap-2">{items.map(renderItem)}</div>
      <Button type="button" variant="link" onClick={addItem} disabled={ownItemCount >= selectableCount} className="mt-2 disabled:opacity-50">
        + Add item
      </Button>
      {!hasProducts && <FieldDescription className="mt-1">Add products first, on the Products page.</FieldDescription>}
      {hasProducts && hint && <FieldDescription className="mt-1">{hint}</FieldDescription>}
      <OrderToMake items={orderItems.toMake} productChoices={productChoices} />
    </div>
  );
}
