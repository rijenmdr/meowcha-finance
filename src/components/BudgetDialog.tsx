"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import { DialogOverlay, dialogTitleClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function BudgetDialog() {
  const { submitBudget } = useFinance();
  const { editingBudget, expenseCategoryOptions } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitBudget({
      categoryId: String(fd.get("categoryId") || ""),
      target: parseFloat(String(fd.get("target") || "0")) || 0,
    });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingBudget ? "Edit budget" : "Add budget category"}</div>

      <div>
        <label className={fieldLabelClass}>Category</label>
        <select
          name="categoryId"
          defaultValue={editingBudget ? editingBudget.categoryId : expenseCategoryOptions[0]?.id}
          disabled={!!editingBudget}
          required
          className={inputClass}
        >
          {expenseCategoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={fieldLabelClass}>Monthly target</label>
        <input
          type="number"
          step="1"
          min="0"
          name="target"
          defaultValue={editingBudget ? editingBudget.target : ""}
          required
          className={inputClass}
        />
      </div>

    </DialogOverlay>
  );
}
