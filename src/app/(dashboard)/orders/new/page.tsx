import { OrderEditorContainer } from "@/components/containers/orders/order-editor-container";

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  const { request } = await searchParams;

  return <OrderEditorContainer mode={request === "1" ? "new-request" : "new"} order={null} />;
}
