import { useCallback } from "react";
import { INVOICE_STATUS_CLASSES } from "@/constants/invoice-status";
import { deleteInvoiceAction, saveInvoiceAction } from "@/lib/actions/invoice";
import { newId } from "@/lib/utils/new-id";
import { confirm } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Invoice, InvoiceSubmitValues } from "@/models/invoice";
import { useOptimisticRows } from "../use-optimistic-rows";

async function submitInvoice(values: InvoiceSubmitValues) {
  const { editingInvoice, close } = useDialogStore.getState();
  const rec: Invoice = {
    id: editingInvoice?.id ?? newId(),
    customerId: values.customerId,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    amount: Math.abs(values.amount || 0),
    paid: values.paid,
  };
  await saveInvoiceAction(rec);
  close();
}

export function useSubmitInvoice() {
  return submitInvoice;
}

export function useInvoiceRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteInvoice = useCallback(
    async (id: string) => {
      if (!(await confirm({ title: "Delete this invoice?", confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id }, () => deleteInvoiceAction(id), "Failed to delete invoice");
    },
    [runOptimistic],
  );

  const markInvoicePaid = useCallback(
    (invoice: Invoice) => {
      const rec: Invoice = { ...invoice, paid: true };
      runOptimistic(
        { kind: "patch", id: invoice.id, patch: { status: "Paid", statusClass: INVOICE_STATUS_CLASSES.Paid, showMarkPaid: false, invoice: rec } },
        () => saveInvoiceAction(rec),
        "Failed to save invoice",
      );
    },
    [runOptimistic],
  );

  return { visibleRows, deleteInvoice, markInvoicePaid };
}
