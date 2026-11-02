import { ProductEditorContainer } from "@/components/containers/products/product-editor-container";
import { getProduct, getVariantIdsInUse } from "@/lib/queries/product";

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const [product, variantIdsInUse] = await Promise.all([getProduct(id), getVariantIdsInUse(id)]);

  return <ProductEditorContainer mode="edit" product={product} variantIdsInUse={variantIdsInUse} />;
}
