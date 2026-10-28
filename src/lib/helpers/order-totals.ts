import type { PaymentStatus } from "@/enums/payment-status";
import type { OrderItem } from "@/models/order";
import { roundMoney } from "@/lib/utils/format-money";

// Mirrors the DB's derived order columns (orders.sub_total via save_order(),
// total_price and payment_status as generated columns).
export function orderTotals(
  items: Pick<OrderItem, "subTotal">[],
  deliveryCharge: number,
  amountPaid: number,
): { subTotal: number; totalPrice: number; paymentStatus: PaymentStatus } {
  const subTotal = roundMoney(items.reduce((a, i) => a + i.subTotal, 0));
  const totalPrice = roundMoney(subTotal + deliveryCharge);
  return { subTotal, totalPrice, paymentStatus: amountPaid >= totalPrice ? "paid" : "partially_paid" };
}
