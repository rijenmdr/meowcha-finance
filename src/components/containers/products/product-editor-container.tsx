import { ProductEditor } from "./product-editor";

// Entry for /products/new and /products/[id]. The editor itself is a client form.
export function ProductEditorContainer({ mode, productId, variantIdsInUse }: { mode: "new" | "edit"; productId?: string; variantIdsInUse: string[] }) {
  return <ProductEditor mode={mode} productId={productId} variantIdsInUse={variantIdsInUse} />;
}
