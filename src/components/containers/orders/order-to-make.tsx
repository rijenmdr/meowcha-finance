import { fmtMoney } from "@/lib/utils/format-money";
import type { OrderItem } from "@/models/order";

// What stock can't cover, which saving splits off into a request linked to the
// order. Merging that request later brings the items back onto the order.
export function OrderToMake({ items, productChoices }: { items: OrderItem[]; productChoices: { id: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border border-accent-200 bg-accent-50 px-3 py-2.5">
      <div className="font-condensed text-15 font-semibold text-accent-800">To make</div>
      <div className="text-12 text-ink/60">Saved as a request linked to this order. Merge it in once the items are made.</div>
      <ul className="mt-1.5 flex flex-col gap-0.5 text-13">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              {item.quantity} × {productChoices.find((product) => product.id === item.variantId)?.label ?? "Product"}
            </span>
            <span>{fmtMoney(item.subTotal)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
