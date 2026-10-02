"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function DeliveryProviderDialog() {
  const { submitDeliveryProvider } = useFinance();
  const { editingDeliveryProvider } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitDeliveryProvider({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingDeliveryProvider ? "Edit delivery provider" : "Add delivery provider"}</div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={editingDeliveryProvider ? editingDeliveryProvider.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        <div className={fieldHintClass}>
          {editingDeliveryProvider
            ? "Renaming updates every order that uses this delivery provider."
            : "Who carries an order to the customer, e.g. a courier or self pickup."}
        </div>
      </div>
    </DialogOverlay>
  );
}
