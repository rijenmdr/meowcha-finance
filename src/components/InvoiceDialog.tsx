"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { TODAY } from "@/lib/mock-data";
import { DialogOverlay, dialogTitleClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function InvoiceDialog() {
  const { submitInvoice } = useFinance();
  const { editingInvoice, customerOptions } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitInvoice({
      customerId: String(fd.get("customerId") || "") || null,
      issueDate: String(fd.get("issueDate") || ""),
      dueDate: String(fd.get("dueDate") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      paid: fd.get("paid") === "on",
    });
  }

  return (
    <DialogOverlay className="max-w-110" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingInvoice ? "Edit invoice" : "New invoice"}</div>

      <div>
        <label className={fieldLabelClass}>Customer (optional)</label>
        <select name="customerId" defaultValue={editingInvoice?.customerId ?? ""} className={inputClass}>
          <option value="">No customer</option>
          {customerOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Issue date</label>
          <input
            type="date"
            name="issueDate"
            defaultValue={editingInvoice ? editingInvoice.issueDate : TODAY}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={fieldLabelClass}>Due date</label>
          <input
            type="date"
            name="dueDate"
            defaultValue={editingInvoice ? editingInvoice.dueDate : TODAY}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={fieldLabelClass}>Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="amount"
          defaultValue={editingInvoice ? editingInvoice.amount : ""}
          required
          className={inputClass}
        />
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-14">
        <input type="checkbox" name="paid" defaultChecked={editingInvoice ? editingInvoice.paid : false} className="size-4" />
        Paid
      </label>

    </DialogOverlay>
  );
}
