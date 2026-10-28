import { useCallback } from "react";
import { deleteCustomerAction, saveCustomerAction } from "@/lib/actions/customer";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Customer, CustomerSubmitValues } from "@/models/customer";
import type { NamedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

async function submitCustomer(values: CustomerSubmitValues) {
  const { editId, close } = useDialogStore.getState();
  const rec: Customer = { id: editId || newId(), ...values };
  await saveCustomerAction(rec);
  close();
}

export function useSubmitCustomer() {
  return submitCustomer;
}

export function useCustomerRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteCustomer = useCallback(
    async (row: NamedRow & { orderCount: number }) => {
      // Every order needs a customer, so orders.customer_id has no on-delete action.
      if (row.orderCount > 0) {
        await notify({
          title: "Can't delete this customer",
          description: `"${row.name}" has ${row.orderCount} order${row.orderCount === 1 ? "" : "s"}. Delete those first.`,
        });
        return;
      }
      const confirmed = await confirm({
        title: "Delete this customer?",
        description: "Linked income and invoices stay, but are unlinked.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteCustomerAction(row.id), "Failed to delete customer");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteCustomer };
}
