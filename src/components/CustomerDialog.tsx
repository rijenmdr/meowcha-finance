"use client";

import { cx } from "@/lib/cx";
import { useFinance, useDashboardData } from "@/lib/finance-context";
import { DialogOverlay, dialogTitleClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function CustomerDialog() {
  const { submitCustomer } = useFinance();
  const { editingCustomer } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitCustomer({
      name: String(fd.get("name") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
    });
  }

  return (
    <DialogOverlay className="max-w-115" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingCustomer ? "Edit customer" : "Add customer"}</div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input type="text" name="name" defaultValue={editingCustomer ? editingCustomer.name : ""} required className={inputClass} />
      </div>

      <div>
        <label className={fieldLabelClass}>Company (optional)</label>
        <input type="text" name="company" defaultValue={editingCustomer ? editingCustomer.company : ""} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Email (optional)</label>
          <input type="email" name="email" defaultValue={editingCustomer ? editingCustomer.email : ""} className={inputClass} />
        </div>
        <div>
          <label className={fieldLabelClass}>Phone (optional)</label>
          <input type="tel" name="phone" defaultValue={editingCustomer ? editingCustomer.phone : ""} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={fieldLabelClass}>Notes (optional)</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={editingCustomer ? editingCustomer.notes : ""}
          className={cx(inputClass, "resize-y")}
        />
      </div>

    </DialogOverlay>
  );
}
