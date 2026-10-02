"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function SourceDialog() {
  const { submitSource } = useFinance();
  const { editingSource } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitSource({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingSource ? "Edit source" : "Add source"}</div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={editingSource ? editingSource.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        <div className={fieldHintClass}>
          {editingSource
            ? "Renaming updates every expense that uses this source."
            : "Where the money for an expense comes from, e.g. a bank account or cash."}
        </div>
      </div>
    </DialogOverlay>
  );
}
