"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function CategoryDialog() {
  const { state, submitCategory } = useFinance();
  const { editingCategory } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitCategory({
      name: String(fd.get("name") || "").trim(),
      type: (editingCategory?.type ?? String(fd.get("type"))) as TxnType,
    });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingCategory ? "Edit category" : "Add category"}</div>

      <div>
        <label className={fieldLabelClass}>Type</label>
        <select
          name="type"
          defaultValue={editingCategory ? editingCategory.type : state.txnFormType}
          disabled={!!editingCategory}
          className={inputClass}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={editingCategory ? editingCategory.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        {editingCategory && (
          <div className={fieldHintClass}>
            Renaming updates every transaction and budget that uses this category.
          </div>
        )}
      </div>

    </DialogOverlay>
  );
}
