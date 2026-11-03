import { useState } from "react";
import { splitShortfall } from "@/lib/helpers/split-shortfall";
import { roundMoney } from "@/lib/utils/format-money";
import { newId } from "@/lib/utils/new-id";
import { parseAmount } from "@/lib/utils/parse-amount";
import type { Order, OrderItem } from "@/models/order";
import type { VariantOption } from "@/models/product";

export interface ItemDraft {
  id: string;
  isCustom: boolean;
  variant: VariantOption | null; // picked from the server-side search; carries the price and stock
  itemName: string;
  itemDetails: string;
  quantity: string;
  subTotal: string;
  fromRequestNumber: string | null; // merged in from a linked request, so made to order
}

function blankItem(): ItemDraft {
  return { id: newId(), isCustom: false, variant: null, itemName: "", itemDetails: "", quantity: "1", subTotal: "", fromRequestNumber: null };
}

function buildItemDrafts(order: Order | null): ItemDraft[] {
  if (!order) return [blankItem()];
  return order.items.map((item) => ({
    id: item.id,
    isCustom: item.variantId === null,
    variant: item.variant,
    itemName: item.itemName,
    itemDetails: item.itemDetails,
    quantity: String(item.quantity),
    subTotal: String(item.subTotal),
    fromRequestNumber: item.fromRequestNumber,
  }));
}

function toOrderItem(item: ItemDraft): OrderItem {
  return {
    id: item.id,
    variantId: item.isCustom ? null : item.variant?.id ?? null,
    isCustom: item.isCustom,
    itemName: item.itemName.trim(),
    itemDetails: item.itemDetails.trim(),
    quantity: parseInt(item.quantity, 10) || 0,
    subTotal: roundMoney(parseAmount(item.subTotal)),
  };
}

// What this order already takes off the shelf for a variant (its stocked line).
function heldBy(order: Order | null, variantId: string) {
  return order?.items.find((item) => item.variantId === variantId && item.stockTracked && item.fromRequestNumber === null)?.quantity ?? 0;
}

// The order editor's item rows and how much of each row stock covers.
// tracksStock: a normal order draws on stock, and
// whatever stock can't cover is split off into a linked request (made to order).
// Requests (and orders converted from one) are made to order and never split.
export function useOrderItems(order: Order | null, { tracksStock }: { tracksStock: boolean }) {
  const [items, setItems] = useState<ItemDraft[]>(() => buildItemDrafts(order));

  // What a variant can supply to this order: the shelf, plus what the order already holds.
  function availableFor(variantId: string) {
    const variant = items.find((item) => item.variant?.id === variantId)?.variant;
    return variant ? variant.quantity + (tracksStock ? heldBy(order, variantId) : 0) : 0;
  }

  // Units on a row that stock can't cover. Merged rows are already made to order.
  function shortfallOf(item: ItemDraft) {
    if (!tracksStock || item.isCustom || item.fromRequestNumber || !item.variant) return 0;
    return Math.max(0, (parseInt(item.quantity, 10) || 0) - availableFor(item.variant.id));
  }

  const ownItems = items.filter((item) => !item.fromRequestNumber);
  const mergedItems = items.filter((item) => item.fromRequestNumber).map(toOrderItem);
  const customItems = ownItems.filter((item) => item.isCustom).map(toOrderItem);
  const catalogItems = ownItems.filter((item) => !item.isCustom && item.variant).map(toOrderItem);
  const split = tracksStock
    ? splitShortfall(catalogItems, availableFor)
    : { stocked: ownItems.map(toOrderItem), toMake: [] };

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.variant) {
          next.isCustom = false;
          next.itemName = patch.variant.name;
          next.itemDetails = patch.variant.details;
          next.subTotal = String(roundMoney(patch.variant.price * (parseInt(next.quantity, 10) || 0)));
        } else if (patch.quantity !== undefined) {
          const previousQuantity = parseInt(item.quantity, 10) || 0;
          next.subTotal = previousQuantity > 0 ? String(roundMoney((parseAmount(item.subTotal) / previousQuantity) * (parseInt(next.quantity, 10) || 0))) : "";
        }
        return next;
      }),
    );
  }

  function addItem() {
    setItems((current) => [...current, blankItem()]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return {
    items,
    shortfallOf,
    // What the order keeps (merged rows included) and what goes to a linked request.
    orderLines: [...split.stocked, ...(tracksStock ? customItems : []), ...mergedItems],
    toMake: split.toMake,
    updateItem,
    addItem,
    removeItem,
  };
}

export type OrderItemsState = ReturnType<typeof useOrderItems>;
