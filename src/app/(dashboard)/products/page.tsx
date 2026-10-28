import { ProductsContainer } from "@/components/containers/products/products-container";
import { getProductsPage } from "@/lib/queries/product";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const data = await getProductsPage(toSearchParams(await searchParams));

  return <ProductsContainer data={data} />;
}
