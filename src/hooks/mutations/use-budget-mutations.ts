import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteBudgetAction, saveBudgetAction } from "@/lib/actions/budget";
import { newId } from "@/lib/utils/new-id";
import { confirm } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Budget, BudgetSubmitValues } from "@/models/budget";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitBudget() {
  const { budgets } = useLookupTables();

  return async function submitBudget(values: BudgetSubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const target = Math.abs(values.target || 0);
    let rec: Budget;
    if (editId) {
      rec = { id: editId, categoryId: budgets.find((b) => b.id === editId)?.categoryId ?? values.categoryId, target };
    } else {
      const existing = budgets.find((b) => b.categoryId === values.categoryId);
      rec = existing ? { ...existing, target } : { id: newId(), categoryId: values.categoryId, target };
    }
    await saveBudgetAction(rec);
    close();
  };
}

export function useBudgetRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteBudget = useCallback(
    async (id: string) => {
      if (!(await confirm({ title: "Remove this budget category?", confirmLabel: "Remove", destructive: true }))) return;
      runOptimistic({ kind: "hide", id }, () => deleteBudgetAction(id), "Failed to delete budget");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteBudget };
}
