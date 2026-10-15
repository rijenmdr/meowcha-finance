import { getVariantIdsInUse } from "@/lib/data";
import { ProductEditorPage } from "@/components/ProductEditorPage";

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const variantIdsInUse = await getVariantIdsInUse(id);
  return <ProductEditorPage mode="edit" productId={id} variantIdsInUse={variantIdsInUse} />;
}
