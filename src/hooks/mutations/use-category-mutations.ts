import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/category";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Category, CategorySubmitValues } from "@/models/category";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitCategory() {
  const { categories } = useLookupTables();

  return async function submitCategory(values: CategorySubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const existing = editId ? categories.find((c) => c.id === editId) : undefined;
    const rec: Category = { id: existing?.id ?? newId(), name: values.name, type: existing?.type ?? values.type };
    const duplicate = categories.some((c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate category", description: `There's already a ${rec.type} category called "${rec.name}".` });
      return;
    }
    await saveCategoryAction(rec);
    close();
  };
}

export function useCategoryRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteCategory = useCallback(
    async (row: UsedRow & { budgeted: boolean }) => {
      if (row.usageCount > 0 || row.budgeted) {
        const uses = [row.usageCount > 0 && `${row.usageCount} transaction${row.usageCount === 1 ? "" : "s"}`, row.budgeted && "a budget"].filter(Boolean);
        await notify({
          title: "Can't delete this category",
          description: `"${row.name}" is used by ${uses.join(" and ")}. Reassign or remove those first, or rename the category instead.`,
        });
        return;
      }
      if (!(await confirm({ title: `Delete the "${row.name}" category?`, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteCategoryAction(row.id), "Failed to delete category");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteCategory };
}
