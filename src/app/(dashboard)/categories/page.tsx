import { getCategoriesPage } from "@/lib/page-data";
import { CategoriesTable } from "@/components/CategoriesTable";

export default async function CategoriesPage() {
  const data = await getCategoriesPage();

  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <CategoriesTable type="income" rows={data.incomeRows} />
      <CategoriesTable type="expense" rows={data.expenseRows} />
    </div>
  );
}
