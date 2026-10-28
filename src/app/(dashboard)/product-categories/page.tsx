import { ProductCategoriesContainer } from "@/components/containers/product-categories/product-categories-container";
import { getProductCategoriesPage } from "@/lib/queries/product-category";

export default async function ProductCategoriesPage() {
  const data = await getProductCategoriesPage();

  return <ProductCategoriesContainer data={data} />;
}
