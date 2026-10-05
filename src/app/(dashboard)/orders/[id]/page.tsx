import { OrderEditorPage } from "@/components/OrderEditorPage";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrderEditorPage mode="edit" orderId={id} />;
}
