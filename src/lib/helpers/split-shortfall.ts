import { roundMoney } from "@/lib/utils/format-money";
import type { OrderItem } from "@/models/order";

// Splits each line at what stock can cover. The rest is made to order, in a
// request linked to the order. A line's sub-total splits by quantity, so a
// discount carries over to both parts. toMake keeps the source line's id.
export function splitShortfall(items: OrderItem[], available: (variantId: string) => number) {
  const stocked: OrderItem[] = [];
  const toMake: OrderItem[] = [];
  for (const item of items) {
    const fromStock = Math.min(item.quantity, Math.max(0, available(item.variantId)));
    const stockSubTotal = roundMoney((item.subTotal * fromStock) / item.quantity);
    if (fromStock > 0) stocked.push({ ...item, quantity: fromStock, subTotal: stockSubTotal });
    if (fromStock < item.quantity) {
      toMake.push({ ...item, quantity: item.quantity - fromStock, subTotal: roundMoney(item.subTotal - stockSubTotal) });
    }
  }
  return { stocked, toMake };
}
