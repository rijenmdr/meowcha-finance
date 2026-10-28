"use client";

import { useDialogStore } from "@/stores/use-dialog-store";
import { TxnDialog } from "./txn-dialog";
import { BudgetDialog } from "./budget-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { CustomerDialog } from "./customer-dialog";
import { CategoryDialog } from "./category-dialog";
import { ChannelDialog } from "./channel-dialog";
import { SourceDialog } from "./source-dialog";
import { PaymentDialog } from "./payment-dialog";
import { DeliveryProviderDialog } from "./delivery-provider-dialog";
import { PaymentMethodDialog } from "./payment-method-dialog";
import { ProductCategoryDialog } from "./product-category-dialog";

// Keyed by dialog+editId so the uncontrolled form fields (defaultValue) reset
// whenever a different record is opened for editing, mirroring the source's
// `dialogFormKey` remount trick.
export function DialogHost() {
  const dialog = useDialogStore((state) => state.dialog);
  const editId = useDialogStore((state) => state.editId);
  const key = `${dialog ?? "none"}-${editId ?? "new"}`;

  if (dialog === "txn") return <TxnDialog key={key} />;
  if (dialog === "budget") return <BudgetDialog key={key} />;
  if (dialog === "invoice") return <InvoiceDialog key={key} />;
  if (dialog === "customer") return <CustomerDialog key={key} />;
  if (dialog === "category") return <CategoryDialog key={key} />;
  if (dialog === "channel") return <ChannelDialog key={key} />;
  if (dialog === "source") return <SourceDialog key={key} />;
  if (dialog === "payment") return <PaymentDialog key={key} />;
  if (dialog === "deliveryProvider") return <DeliveryProviderDialog key={key} />;
  if (dialog === "paymentMethod") return <PaymentMethodDialog key={key} />;
  if (dialog === "productCategory") return <ProductCategoryDialog key={key} />;
  return null;
}
