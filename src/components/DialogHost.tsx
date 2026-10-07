"use client";

import { useFinance } from "@/lib/finance-context";
import { TxnDialog } from "./TxnDialog";
import { BudgetDialog } from "./BudgetDialog";
import { InvoiceDialog } from "./InvoiceDialog";
import { CustomerDialog } from "./CustomerDialog";
import { CategoryDialog } from "./CategoryDialog";
import { ChannelDialog } from "./ChannelDialog";
import { SourceDialog } from "./SourceDialog";
import { OrderDialog } from "./OrderDialog";
import { PaymentDialog } from "./PaymentDialog";
import { DeliveryProviderDialog } from "./DeliveryProviderDialog";
import { PaymentMethodDialog } from "./PaymentMethodDialog";

// Keyed by dialog+editId so the uncontrolled form fields (defaultValue) reset
// whenever a different record is opened for editing, mirroring the source's
// `dialogFormKey` remount trick.
export function DialogHost() {
  const { state } = useFinance();
  const key = `${state.dialog ?? "none"}-${state.editId ?? "new"}`;

  if (state.dialog === "txn") return <TxnDialog key={key} />;
  if (state.dialog === "budget") return <BudgetDialog key={key} />;
  if (state.dialog === "invoice") return <InvoiceDialog key={key} />;
  if (state.dialog === "customer") return <CustomerDialog key={key} />;
  if (state.dialog === "category") return <CategoryDialog key={key} />;
  if (state.dialog === "channel") return <ChannelDialog key={key} />;
  if (state.dialog === "source") return <SourceDialog key={key} />;
  if (state.dialog === "order") return <OrderDialog key={key} />;
  if (state.dialog === "payment") return <PaymentDialog key={key} />;
  if (state.dialog === "deliveryProvider") return <DeliveryProviderDialog key={key} />;
  if (state.dialog === "paymentMethod") return <PaymentMethodDialog key={key} />;
  return null;
}
