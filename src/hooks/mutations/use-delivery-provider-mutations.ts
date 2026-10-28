import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteDeliveryProviderAction, saveDeliveryProviderAction } from "@/lib/actions/delivery-provider";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { DeliveryProvider, DeliveryProviderSubmitValues } from "@/models/delivery-provider";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitDeliveryProvider() {
  const { deliveryProviders } = useLookupTables();

  return async function submitDeliveryProvider(values: DeliveryProviderSubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const rec: DeliveryProvider = { id: editId || newId(), name: values.name };
    // Mirrors the DB's unique (name), but case-insensitively.
    const duplicate = deliveryProviders.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate delivery provider", description: `There's already a delivery provider called "${rec.name}".` });
      return;
    }
    await saveDeliveryProviderAction(rec);
    close();
  };
}

export function useDeliveryProviderRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteDeliveryProvider = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} order${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      const confirmed = await confirm({ title: `Delete the "${row.name}" delivery provider?`, description: usage, confirmLabel: "Delete", destructive: true });
      if (!confirmed) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteDeliveryProviderAction(row.id), "Failed to delete delivery provider");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteDeliveryProvider };
}
