import { useCallback } from "react";
import { deleteTransactionAction, saveTransactionAction } from "@/lib/actions/transaction";
import { newId } from "@/lib/utils/new-id";
import { confirm } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Transaction, TxnSubmitValues } from "@/models/transaction";
import { useOptimisticRows } from "../use-optimistic-rows";

async function submitTxn(values: TxnSubmitValues) {
  const { editingTxn: existing, txnFormType, close } = useDialogStore.getState();
  const rec: Transaction = {
    id: existing?.id ?? newId(),
    date: values.date,
    type: txnFormType,
    categoryId: values.categoryId,
    description: values.description,
    channelId: values.channelId,
    sourceId: txnFormType === "expense" ? values.sourceId : null,
    amount: Math.abs(values.amount || 0),
    customerId: txnFormType === "income" ? values.customerId : null,
    // The dialog doesn't edit the order link; it only survives while this stays income.
    orderId: txnFormType === "income" ? (existing?.orderId ?? null) : null,
  };
  await saveTransactionAction(rec);
  close();
}

export function useSubmitTxn() {
  return submitTxn;
}

export function useTransactionRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteTxn = useCallback(
    async (row: { id: string; orderNumber: string | null }) => {
      const note = row.orderNumber ? `It's a payment for ${row.orderNumber}, so that order's amount paid will drop.` : undefined;
      if (!(await confirm({ title: "Delete this transaction?", description: note, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteTransactionAction(row.id), "Failed to delete transaction");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteTxn };
}
