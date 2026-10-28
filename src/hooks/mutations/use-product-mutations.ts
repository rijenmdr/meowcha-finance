import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteProductAction, saveProductAction } from "@/lib/actions/product";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import type { Product, ProductSubmitValues } from "@/models/product";
import type { NamedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitProduct() {
  const { products } = useLookupTables();

  // Resolves to a message when the product can't be saved; throws if the server save fails.
  return async function submitProduct(values: ProductSubmitValues, variantIdsInUse: string[]): Promise<string | null> {
    const rec: Product = {
      id: values.id || newId(),
      name: values.name,
      categoryId: values.categoryId,
      optionNames: values.optionNames,
      variants: values.variants.map((v) => ({
        id: v.id,
        options: v.options,
        quantity: Math.max(0, Math.trunc(v.quantity || 0)),
        price: Math.abs(v.price || 0),
      })),
    };
    // Mirrors the DB's unique product name, case-insensitively.
    if (products.some((p) => p.id !== rec.id && p.name.trim().toLowerCase() === rec.name.toLowerCase())) {
      return `"${rec.name}" already exists. Add a variant to that product instead.`;
    }
    // A removed variant that is on an order would be rejected by the DB.
    const kept = new Set(rec.variants.map((v) => v.id));
    const removedInUse = variantIdsInUse.filter((id) => !kept.has(id)).length;
    if (removedInUse > 0) {
      return `${removedInUse === 1 ? "A removed variant is" : "Removed variants are"} on an order. Remove ${removedInUse === 1 ? "it" : "them"} from those orders first.`;
    }
    await saveProductAction(rec);
    return null;
  };
}

export function useProductRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteProduct = useCallback(
    async (row: NamedRow & { variantCount: number; orderCount: number }) => {
      // order_items.variant_id has no on-delete action, so the DB would reject this.
      if (row.orderCount > 0) {
        await notify({
          title: "Can't delete this product",
          description: `"${row.name}" is on ${row.orderCount} order${row.orderCount === 1 ? "" : "s"}. Remove it from those first.`,
        });
        return;
      }
      const confirmed = await confirm({
        title: `Delete "${row.name}"?`,
        description: `Its ${row.variantCount} variant${row.variantCount === 1 ? "" : "s"} will be deleted too.`,
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteProductAction(row.id), "Failed to delete product");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteProduct };
}
