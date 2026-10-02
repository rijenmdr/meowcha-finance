"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { TODAY } from "@/lib/mock-data";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

// Records one more payment towards an order, saved as an income transaction.
export function PaymentDialog() {
  const { submitPayment } = useFinance();
  const { paymentDialog, incomeCategoryOptions, incomeChannelOptions } = useDashboardData();
  if (!paymentDialog) return null;

  function handleSubmit(fd: FormData) {
    return submitPayment({
      date: String(fd.get("date") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      categoryId: String(fd.get("categoryId") || ""),
      channelId: String(fd.get("channelId") || "") || null,
    });
  }

  return (
    <DialogOverlay className="max-w-110" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>Record payment · {paymentDialog.orderNumber}</div>
      <div className="text-13 text-ink/60">
        {paymentDialog.paidDisplay} of {paymentDialog.totalDisplay} paid so far.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Amount (Rs)</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            max={paymentDialog.balance}
            step="0.01"
            defaultValue={paymentDialog.balance}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={fieldLabelClass}>Date</label>
          <input type="date" name="date" defaultValue={TODAY} required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Income category</label>
          <select name="categoryId" defaultValue={paymentDialog.categoryId} required className={inputClass}>
            {incomeCategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={fieldLabelClass}>Channel (optional)</label>
          <select name="channelId" defaultValue={paymentDialog.channelId} className={inputClass}>
            <option value="">No channel</option>
            {incomeChannelOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={fieldHintClass}>Saved as an income transaction linked to this order.</div>
    </DialogOverlay>
  );
}
