import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils/cn";
import { fmtMoney } from "@/lib/utils/format-money";
import type { PaymentStatus } from "@/enums/payment-status";
import type { ParentOrder } from "@/models/order";

const summaryRowClass = "flex justify-between text-13";

// links: what's split off into a linked request (toMakeTotal), or, on a linked
// request, the order that charges the delivery and takes the advance.
// requestsAdvance is the advance going to the order's linked requests, or, on a
// linked request, its own share.
export function OrderSummary({
  isRequest,
  totals,
  paidValue,
  balanceDue,
  links,
}: {
  isRequest: boolean;
  totals: { subTotal: number; totalPrice: number; paymentStatus: PaymentStatus };
  paidValue: number;
  balanceDue: number;
  links: { toMakeTotal: number; parent: ParentOrder | null; requestsAdvance: number };
}) {
  const { toMakeTotal, parent, requestsAdvance } = links;

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
          <span>{parent ? `On ${parent.orderNumber}` : fmtMoney(totals.totalPrice - totals.subTotal)}</span>
        </div>
        <div className={cn(summaryRowClass, "font-semibold")}>
          <span>Total</span>
          <span>{fmtMoney(totals.totalPrice)}</span>
        </div>
        {toMakeTotal > 0 && (
          <div className={summaryRowClass}>
            <span className="text-ink/60">To make (linked request)</span>
            <span>{fmtMoney(toMakeTotal)}</span>
          </div>
        )}
        {parent ? (
          <>
            <div className={summaryRowClass}>
              <span className="text-ink/60">Advance with {parent.orderNumber}</span>
              <span>{fmtMoney(parent.advanceAmount ?? 0)}</span>
            </div>
            <div className={summaryRowClass}>
              <span className="text-ink/60">This request&apos;s share</span>
              <span>{fmtMoney(requestsAdvance)}</span>
            </div>
          </>
        ) : (
          <>
            <div className={summaryRowClass}>
              <span className="text-ink/60">Amount paid</span>
              <span>{fmtMoney(paidValue)}</span>
            </div>
            {requestsAdvance > 0 && (
              <div className={summaryRowClass}>
                <span className="text-ink/60">Advance for linked requests</span>
                <span>{fmtMoney(requestsAdvance)}</span>
              </div>
            )}
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
          </>
        )}
      </div>
    </Panel>
  );
}
