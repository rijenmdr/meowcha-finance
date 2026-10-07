import { ProductEditorPage } from "@/components/ProductEditorPage";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditorPage mode="edit" productId={id} />;
}
