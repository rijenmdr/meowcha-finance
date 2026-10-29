import type { OrderEditorMode } from "@/enums/order-editor-mode";

export const ORDER_EDITOR_TITLES: Record<OrderEditorMode, (orderNumber: string) => string> = {
  new: () => "New order",
  edit: (n) => `Edit order ${n}`,
  "new-request": () => "New request",
  "edit-request": (n) => `Edit request ${n}`,
  convert: (n) => `Convert request ${n}`,
  view: (n) => `Order ${n}`,
};

export const ORDER_EDITOR_DESCRIPTIONS: Record<OrderEditorMode, string> = {
  new: "Create the order, and record its advance if the customer pays now. Anything out of stock becomes a linked request to make.",
  edit: "Edit the order and its advance. Record later payments from the Orders table; correct them on the Transactions page.",
  "new-request": "Save a made-to-order request. Its items don't touch stock, and it can hold one advance payment.",
  "edit-request": "Edit the request. Convert it to an order (or merge a linked request into its order) once the items are ready.",
  convert: "Review the request, then save it as an order. Its items still won't touch stock.",
  view: "This order was cancelled, so it's read-only. Its payments stay as income.",
};

// A read-only order has no save button.
export const ORDER_EDITOR_SAVE_LABELS: Record<OrderEditorMode, string> = {
  new: "Save order",
  edit: "Save order",
  "new-request": "Save request",
  "edit-request": "Save request",
  convert: "Convert to order",
  view: "",
};
