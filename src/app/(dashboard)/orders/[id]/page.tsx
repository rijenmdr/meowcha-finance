import { OrderEditorContainer } from "@/components/containers/orders/order-editor-container";
import { orderEditorMode } from "@/lib/helpers/order-editor-mode";
import { getOrder } from "@/lib/queries/order";

export default async function EditOrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const [{ id }, { convert }] = await Promise.all([params, searchParams]);
  const order = await getOrder(id);

  return <OrderEditorContainer mode={orderEditorMode(order, convert)} order={order} />;
}
