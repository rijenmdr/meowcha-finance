import { useState } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { roundMoney } from "@/lib/utils/format-money";
import { newId } from "@/lib/utils/new-id";
import type { Order } from "@/models/order";

export interface ItemDraft {
  id: string;
  productId: string;
  quantity: string;
  subTotal: string;
}

function buildItemDrafts(order: Order | null): ItemDraft[] {
  if (!order) return [{ id: newId(), productId: "", quantity: "1", subTotal: "" }];
  return order.items.map((item) => ({ id: item.id, productId: item.variantId, quantity: String(item.quantity), subTotal: String(item.subTotal) }));
}

// The order editor's item rows, and which variants each row may pick.
// tracksStock: only a normal order draws on stock. Requests (and orders
// converted from one) are made to order, so they can use any variant.
export function useOrderItems(order: Order | null, { tracksStock, isRequest }: { tracksStock: boolean; isRequest: boolean }) {
  const { orderProductOptions } = useLookups();
  const [items, setItems] = useState<ItemDraft[]>(() => buildItemDrafts(order));

  // What each variant can supply to this order: the shelf, plus what the order already holds.
  const productChoices = orderProductOptions.map((product) => {
    const held = tracksStock ? (order?.items.find((item) => item.variantId === product.id)?.quantity ?? 0) : 0;
    const available = product.quantity + held;
    return { ...product, available, stockLabel: available > 0 ? `${available} in stock` : "out of stock" };
  });

  // An order picks from what's in stock; a request is for what isn't.
  function canPick(product: (typeof productChoices)[number]) {
    if (tracksStock) return product.available > 0;
    if (isRequest) return product.available === 0;
    return true;
  }

  const selectableCount = productChoices.filter(canPick).length;

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
    setItems((current) => [...current, { id: newId(), productId: "", quantity: "1", subTotal: "" }]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return { items, productChoices, canPick, selectableCount, hasProducts: orderProductOptions.length > 0, updateItem, addItem, removeItem };
}

export type OrderItemsState = ReturnType<typeof useOrderItems>;
