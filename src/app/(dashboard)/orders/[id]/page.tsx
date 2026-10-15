import { getOrder } from "@/lib/data";
import { OrderEditorPage } from "@/components/OrderEditorPage";

export default async function EditOrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const order = await getOrder(id);
  return <OrderEditorPage mode="edit" order={order} />;
}
