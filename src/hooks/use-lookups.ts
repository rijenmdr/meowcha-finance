import { useMemo } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { variantLabel } from "@/lib/helpers/variant-label";
import { fmtMoney, roundMoney } from "@/lib/utils/format-money";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { DialogKind } from "@/enums/dialog-kind";
import type { TxnType } from "@/enums/txn-type";

// Dropdown options and the record each dialog edits, from the lookup tables.
// Totals and table rows don't belong here: they come from the server per page.
export function useLookups() {
  const l = useLookupTables();
  const dialog = useDialogStore((state) => state.dialog);
  const editId = useDialogStore((state) => state.editId);
  const txnFormType = useDialogStore((state) => state.txnFormType);
  const editingTxn = useDialogStore((state) => state.editingTxn);
  const editingInvoice = useDialogStore((state) => state.editingInvoice);
  const paymentTarget = useDialogStore((state) => state.paymentTarget);

  return useMemo(() => {
    const categoryOptions = (type: TxnType) => l.categories.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const channelOptions = (type: TxnType) => l.channels.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const editing = <T extends { id: string }>(kind: DialogKind, list: T[]): T | null =>
      dialog === kind && editId ? (list.find((x) => x.id === editId) ?? null) : null;

    // New payments default to the order's last payment's category and channel,
    // else to the "Order Sales" category (added by the orders migration).
    const incomeCategories = l.categories.filter((c) => c.type === "income");
    const defaultPaymentCategoryId = (incomeCategories.find((c) => c.name === "Order Sales") ?? incomeCategories[0])?.id ?? "";
    const target = dialog === "payment" ? paymentTarget : null;
    const paymentDialog = target
      ? {
          orderNumber: target.orderNumber,
          totalDisplay: fmtMoney(target.totalPrice),
          paidDisplay: fmtMoney(target.amountPaid),
          balance: roundMoney(target.totalPrice - target.amountPaid),
          categoryId: target.categoryId ?? defaultPaymentCategoryId,
          channelId: target.channelId ?? "",
        }
      : null;

    return {
      incomeCategoryOptions: categoryOptions("income"),
      expenseCategoryOptions: categoryOptions("expense"),
      txnCategoryOptions: categoryOptions(txnFormType),
      txnChannelOptions: channelOptions(txnFormType),
      incomeChannelOptions: channelOptions("income"),
      customerOptions: l.customers.map((c) => ({ id: c.id, name: c.name })),
      sourceOptions: l.sources.map((x) => ({ id: x.id, name: x.name })),
      deliveryProviderOptions: l.deliveryProviders.map((x) => ({ id: x.id, name: x.name })),
      paymentMethodOptions: l.paymentMethods.map((x) => ({ id: x.id, name: x.name })),
      productCategoryOptions: l.productCategories.map((x) => ({ id: x.id, name: x.name })),
      orderProductOptions: l.products.flatMap((p) =>
        p.variants.map((v) => {
          const label = variantLabel(p.optionNames, v.options);
          return { id: v.id, label: label ? `${p.name} · ${label}` : p.name, price: v.price, quantity: v.quantity };
        }),
      ),
      productOptionNameOptions: [...new Set(l.products.flatMap((p) => p.optionNames))].sort((a, b) => a.localeCompare(b)),
      // Options whose values come from a fixed list (keyed by lower-cased option name).
      productOptionValueOptions: { type: ["Lined", "Blank"] } as Record<string, string[]>,
      defaultPaymentCategoryId,

      editingTxn: dialog === "txn" ? editingTxn : null,
      editingBudget: editing("budget", l.budgets),
      editingInvoice: dialog === "invoice" ? editingInvoice : null,
      editingCustomer: editing("customer", l.customers),
      editingCategory: editing("category", l.categories),
      editingChannel: editing("channel", l.channels),
      editingSource: editing("source", l.sources),
      editingDeliveryProvider: editing("deliveryProvider", l.deliveryProviders),
      editingPaymentMethod: editing("paymentMethod", l.paymentMethods),
      editingProductCategory: editing("productCategory", l.productCategories),
      paymentDialog,
    };
  }, [dialog, editId, txnFormType, editingTxn, editingInvoice, paymentTarget, l]);
}
