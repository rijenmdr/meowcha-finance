"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils/cn";
import { fmtMoney } from "@/lib/utils/format-money";
import type { ItemDraft, OrderItemsState } from "@/hooks/use-order-items";

const itemGridClass = "grid grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_1.75rem] items-center gap-2";

// Explains why some variants aren't listed. Null when every variant can be picked.
function pickerHint(tracksStock: boolean, isRequest: boolean, selectableCount: number): string | null {
  if (tracksStock) {
    const listed = selectableCount === 0 ? "Nothing is in stock." : "Only variants in stock are listed.";
    return `${listed} For something out of stock, save a request instead.`;
  }
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
  const { items, productChoices, canPick, selectableCount, hasProducts, updateItem, addItem, removeItem } = orderItems;
  const hint = pickerHint(tracksStock, isRequest, selectableCount);

  function renderItem(item: ItemDraft) {
    const takenElsewhere = new Set(items.filter((other) => other.id !== item.id).map((other) => other.productId));
    const chosen = productChoices.find((product) => product.id === item.productId);
    const choices = productChoices.filter((product) => product.id === item.productId || (!takenElsewhere.has(product.id) && canPick(product)));

    return (
      <div key={item.id} className={itemGridClass}>
        <NativeSelect aria-label="Product" value={item.productId} onChange={(event) => updateItem(item.id, { productId: event.target.value })} required>
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
          max={tracksStock && chosen ? chosen.available : undefined}
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
      <Button type="button" variant="link" onClick={addItem} disabled={items.length >= selectableCount} className="mt-2 disabled:opacity-50">
        + Add item
      </Button>
      {!hasProducts && <FieldDescription className="mt-1">Add products first, on the Products page.</FieldDescription>}
      {hasProducts && hint && <FieldDescription className="mt-1">{hint}</FieldDescription>}
    </div>
  );
}
