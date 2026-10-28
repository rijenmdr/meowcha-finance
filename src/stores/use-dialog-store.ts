import { create } from "zustand";
import type { DialogKind } from "@/enums/dialog-kind";
import type { Invoice } from "@/models/invoice";
import type { PaymentTarget } from "@/models/order";
import type { Transaction } from "@/models/transaction";
import type { TxnType } from "@/enums/txn-type";

// The records being edited come from the row that opened the dialog, because
// transactions and invoices are paged on the server and aren't in the lookups.
interface OpenDetails {
  editId?: string;
  txnFormType?: TxnType;
  editingTxn?: Transaction;
  editingInvoice?: Invoice;
  paymentTarget?: PaymentTarget;
}

interface DialogState {
  dialog: DialogKind | null;
  editId: string | null;
  // The transaction dialog's type toggle, and the default type for new categories and channels.
  txnFormType: TxnType;
  editingTxn: Transaction | null;
  editingInvoice: Invoice | null;
  paymentTarget: PaymentTarget | null;
  open: (dialog: DialogKind, details?: OpenDetails) => void;
  close: () => void;
  setTxnFormType: (type: TxnType) => void;
}

const CLOSED = { dialog: null, editId: null, editingTxn: null, editingInvoice: null, paymentTarget: null } as const;

export const useDialogStore = create<DialogState>((set) => ({
  ...CLOSED,
  txnFormType: "expense",
  open: (dialog, details = {}) =>
    set((current) => ({
      ...CLOSED,
      dialog,
      editId: details.editId ?? null,
      txnFormType: details.txnFormType ?? current.txnFormType,
      editingTxn: details.editingTxn ?? null,
      editingInvoice: details.editingInvoice ?? null,
      paymentTarget: details.paymentTarget ?? null,
    })),
  close: () => set(CLOSED),
  setTxnFormType: (type) => set({ txnFormType: type }),
}));
