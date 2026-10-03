import { OrderEditorPage } from "@/components/OrderEditorPage";

export default function EditOrderPage({ params }: { params: { id: string } }) {
    return <OrderEditorPage mode="edit" orderId={params.id} />;
}
