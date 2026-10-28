// new / edit: a normal order. new-request / edit-request: a made-to-order
// request (status "requested"). convert: a request being saved as an order.
// view: a cancelled order, read-only.
export const ORDER_EDITOR_MODE = {
  new: "new",
  edit: "edit",
  newRequest: "new-request",
  editRequest: "edit-request",
  convert: "convert",
  view: "view",
} as const;
export type OrderEditorMode = (typeof ORDER_EDITOR_MODE)[keyof typeof ORDER_EDITOR_MODE];
