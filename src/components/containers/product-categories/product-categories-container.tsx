import type { getProductCategoriesPage } from "@/lib/queries/product-category";
import { ProductCategoriesTable } from "./product-categories-table";

type ProductCategoriesPageData = Awaited<ReturnType<typeof getProductCategoriesPage>>;

export function ProductCategoriesContainer({ data }: { data: ProductCategoriesPageData }) {
  return <ProductCategoriesTable rows={data.rows} empty={data.productCategoriesEmpty} />;
}
