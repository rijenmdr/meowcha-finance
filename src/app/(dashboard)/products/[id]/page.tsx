import { ProductEditorContainer } from "@/components/containers/products/product-editor-container";
import { getVariantIdsInUse } from "@/lib/queries/product";

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const variantIdsInUse = await getVariantIdsInUse(id);

  return <ProductEditorContainer mode="edit" productId={id} variantIdsInUse={variantIdsInUse} />;
}
