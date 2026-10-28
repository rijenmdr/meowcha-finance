import { CategoriesContainer } from "@/components/containers/categories/categories-container";
import { getCategoriesPage } from "@/lib/queries/category";

export default async function CategoriesPage() {
  const data = await getCategoriesPage();

  return <CategoriesContainer data={data} />;
}
