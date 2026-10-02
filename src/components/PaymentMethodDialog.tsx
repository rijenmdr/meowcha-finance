"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function PaymentMethodDialog() {
  const { submitPaymentMethod } = useFinance();
  const { editingPaymentMethod } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitPaymentMethod({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingPaymentMethod ? "Edit payment method" : "Add payment method"}</div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={editingPaymentMethod ? editingPaymentMethod.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        <div className={fieldHintClass}>
          {editingPaymentMethod
            ? "Renaming updates every order that uses this payment method."
            : "How a customer pays for an order, e.g. cash, eSewa or bank transfer."}
        </div>
      </div>
    </DialogOverlay>
  );
}
