import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils/cn";
import { fmtMoney } from "@/lib/utils/format-money";
import type { PaymentStatus } from "@/enums/payment-status";

const summaryRowClass = "flex justify-between text-13";

export function OrderSummary({
  isRequest,
  totals,
  deliveryCharge,
  paidValue,
  balanceDue,
}: {
  isRequest: boolean;
  totals: { subTotal: number; totalPrice: number; paymentStatus: PaymentStatus };
  deliveryCharge: number;
  paidValue: number;
  balanceDue: number;
}) {
  return (
    <Panel className="p-6">
      <div className="font-condensed text-20 font-semibold">{isRequest ? "Request summary" : "Order summary"}</div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-line-soft pt-3">
        <div className={summaryRowClass}>
          <span className="text-ink/60">Sub-total</span>
          <span>{fmtMoney(totals.subTotal)}</span>
        </div>
        <div className={summaryRowClass}>
          <span className="text-ink/60">Delivery</span>
          <span>{fmtMoney(deliveryCharge)}</span>
        </div>
        <div className={cn(summaryRowClass, "font-semibold")}>
          <span>Total</span>
          <span>{fmtMoney(totals.totalPrice)}</span>
        </div>
        <div className={summaryRowClass}>
          <span className="text-ink/60">Amount paid</span>
          <span>{fmtMoney(paidValue)}</span>
        </div>
        <div className={summaryRowClass}>
          <span className="text-ink/60">Balance due</span>
          <span>{fmtMoney(balanceDue)}</span>
        </div>
        <div className={cn(summaryRowClass, "items-center")}>
          <span className="text-ink/60">Payment status</span>
          {totals.paymentStatus === "paid" ? (
            <Badge variant="secondary" className="px-2 py-0.75 text-11">
              Paid
            </Badge>
          ) : (
            <Badge variant="outline" className="border-accent-800 px-2 py-0.75 text-11 text-accent-800">
              Partially paid
            </Badge>
          )}
        </div>
      </div>
    </Panel>
  );
}
