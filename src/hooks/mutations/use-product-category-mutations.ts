import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteProductCategoryAction, saveProductCategoryAction } from "@/lib/actions/product-category";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { ProductCategory, ProductCategorySubmitValues } from "@/models/product-category";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitProductCategory() {
  const { productCategories } = useLookupTables();

  return async function submitProductCategory(values: ProductCategorySubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const rec: ProductCategory = { id: editId || newId(), name: values.name };
    // Mirrors the DB's unique lower(btrim(name)).
    const duplicate = productCategories.some((x) => x.id !== rec.id && x.name.trim().toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate product category", description: `There's already a product category called "${rec.name}".` });
      return;
    }
    await saveProductCategoryAction(rec);
    close();
  };
}

export function useProductCategoryRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteProductCategory = useCallback(
    async (row: UsedRow) => {
      // Every product needs a category, so products.category_id restricts the delete.
      if (row.usageCount > 0) {
        await notify({
          title: "Can't delete this category",
          description: `"${row.name}" is used by ${row.usageCount} product${row.usageCount === 1 ? "" : "s"}. Move them to another category first, or rename this one instead.`,
        });
        return;
      }
      if (!(await confirm({ title: `Delete the "${row.name}" product category?`, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteProductCategoryAction(row.id), "Failed to delete product category");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteProductCategory };
}
