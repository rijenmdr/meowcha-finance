import { useState } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { splitShortfall } from "@/lib/helpers/split-shortfall";
import { roundMoney } from "@/lib/utils/format-money";
import { newId } from "@/lib/utils/new-id";
import { parseAmount } from "@/lib/utils/parse-amount";
import type { Order, OrderItem } from "@/models/order";

export interface ItemDraft {
  id: string;
  productId: string;
  quantity: string;
  subTotal: string;
  fromRequestNumber: string | null; // merged in from a linked request, so made to order
}

function blankItem(): ItemDraft {
  return { id: newId(), productId: "", quantity: "1", subTotal: "", fromRequestNumber: null };
}

function buildItemDrafts(order: Order | null): ItemDraft[] {
  if (!order) return [blankItem()];
  return order.items.map((item) => ({
    id: item.id,
    productId: item.variantId,
    quantity: String(item.quantity),
    subTotal: String(item.subTotal),
    fromRequestNumber: item.fromRequestNumber,
  }));
}

function toOrderItem(item: ItemDraft): OrderItem {
  return {
    id: item.id,
    variantId: item.productId,
    quantity: parseInt(item.quantity, 10) || 0,
    subTotal: roundMoney(parseAmount(item.subTotal)),
  };
}

// What this order already takes off the shelf for a variant (its stocked line).
function heldBy(order: Order | null, variantId: string) {
  return order?.items.find((item) => item.variantId === variantId && item.stockTracked && item.fromRequestNumber === null)?.quantity ?? 0;
}

// The order editor's item rows, which variants each row may pick, and how much
// of each row stock covers. tracksStock: a normal order draws on stock, and
// whatever stock can't cover is split off into a linked request (made to order).
// Requests (and orders converted from one) are made to order and never split.
export function useOrderItems(order: Order | null, { tracksStock, isRequest }: { tracksStock: boolean; isRequest: boolean }) {
  const { orderProductOptions } = useLookups();
  const [items, setItems] = useState<ItemDraft[]>(() => buildItemDrafts(order));

  // What each variant can supply to this order: the shelf, plus what the order already holds.
  const productChoices = orderProductOptions.map((product) => {
    const available = product.quantity + (tracksStock ? heldBy(order, product.id) : 0);
    return { ...product, available, stockLabel: available > 0 ? `${available} in stock` : "out of stock" };
  });

  // A request is for what's out of stock. An order can pick anything.
  function canPick(product: (typeof productChoices)[number]) {
    return isRequest ? product.available === 0 : true;
  }

  function availableFor(variantId: string) {
    return productChoices.find((product) => product.id === variantId)?.available ?? 0;
  }

  // Units on a row that stock can't cover. Merged rows are already made to order.
  function shortfallOf(item: ItemDraft) {
    if (!tracksStock || item.fromRequestNumber || !item.productId) return 0;
    return Math.max(0, (parseInt(item.quantity, 10) || 0) - availableFor(item.productId));
  }

  const ownItems = items.filter((item) => !item.fromRequestNumber);
  const mergedItems = items.filter((item) => item.fromRequestNumber).map(toOrderItem);
  const split = tracksStock
    ? splitShortfall(ownItems.filter((item) => item.productId).map(toOrderItem), availableFor)
    : { stocked: ownItems.map(toOrderItem), toMake: [] };

  function priceOf(productId: string) {
    return orderProductOptions.find((product) => product.id === productId)?.price ?? 0;
  }

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId !== undefined || patch.quantity !== undefined) {
          next.subTotal = next.productId ? String(roundMoney(priceOf(next.productId) * (parseInt(next.quantity, 10) || 0))) : "";
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
    productChoices,
    canPick,
    selectableCount: productChoices.filter(canPick).length,
    ownItemCount: ownItems.length,
    hasProducts: orderProductOptions.length > 0,
    shortfallOf,
    // What the order keeps (merged rows included) and what goes to a linked request.
    orderLines: [...split.stocked, ...mergedItems],
    toMake: split.toMake,
    updateItem,
    addItem,
    removeItem,
  };
}

export type OrderItemsState = ReturnType<typeof useOrderItems>;
