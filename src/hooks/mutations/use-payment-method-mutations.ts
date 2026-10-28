import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deletePaymentMethodAction, savePaymentMethodAction } from "@/lib/actions/payment-method";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { PaymentMethod, PaymentMethodSubmitValues } from "@/models/payment-method";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitPaymentMethod() {
  const { paymentMethods } = useLookupTables();

  return async function submitPaymentMethod(values: PaymentMethodSubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const rec: PaymentMethod = { id: editId || newId(), name: values.name };
    const duplicate = paymentMethods.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate payment method", description: `There's already a payment method called "${rec.name}".` });
      return;
    }
    await savePaymentMethodAction(rec);
    close();
  };
}

export function usePaymentMethodRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deletePaymentMethod = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} order${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      const confirmed = await confirm({ title: `Delete the "${row.name}" payment method?`, description: usage, confirmLabel: "Delete", destructive: true });
      if (!confirmed) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deletePaymentMethodAction(row.id), "Failed to delete payment method");
    },
    [runOptimistic],
  );

  return { visibleRows, deletePaymentMethod };
}
