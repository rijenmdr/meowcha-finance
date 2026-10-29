import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { Order } from "@/models/order";

// The order's status picks the mode, so a stale ?convert=1 can't reopen a converted request.
// A linked request is merged into its order from the Requests tab, never converted.
export function orderEditorMode(order: Order | null, convert: string | string[] | undefined): OrderEditorMode {
  if (order?.status === "requested") return convert === "1" && !order.parentOrder ? "convert" : "edit-request";
  if (order?.status === "cancelled") return "view";
  return "edit";
}
