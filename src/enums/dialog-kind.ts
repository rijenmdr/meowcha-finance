export const DIALOG_KIND = {
  txn: "txn",
  budget: "budget",
  invoice: "invoice",
  customer: "customer",
  category: "category",
  channel: "channel",
  source: "source",
  payment: "payment",
  deliveryProvider: "deliveryProvider",
  paymentMethod: "paymentMethod",
  productCategory: "productCategory",
} as const;
export type DialogKind = (typeof DIALOG_KIND)[keyof typeof DIALOG_KIND];
