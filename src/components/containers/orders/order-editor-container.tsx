import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { Order } from "@/models/order";
import { OrderEditor } from "./order-editor";

// Entry for /orders/new and /orders/[id]. The editor itself is a client form.
export function OrderEditorContainer({ mode, order }: { mode: OrderEditorMode; order: Order | null }) {
  return <OrderEditor mode={mode} order={order} />;
}
