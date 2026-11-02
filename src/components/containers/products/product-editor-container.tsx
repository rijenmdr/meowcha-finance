import type { Product } from "@/models/product";
import { ProductEditor } from "./product-editor";

// Entry for /products/new and /products/[id]. The editor itself is a client form.
export function ProductEditorContainer({ mode, product, variantIdsInUse }: { mode: "new" | "edit"; product: Product | null; variantIdsInUse: string[] }) {
  return <ProductEditor mode={mode} product={product} variantIdsInUse={variantIdsInUse} />;
}
