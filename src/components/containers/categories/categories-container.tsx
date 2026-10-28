import type { getCategoriesPage } from "@/lib/queries/category";
import { CategoriesTable } from "./categories-table";

type CategoriesPageData = Awaited<ReturnType<typeof getCategoriesPage>>;

export function CategoriesContainer({ data }: { data: CategoriesPageData }) {
  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <CategoriesTable type="income" rows={data.incomeRows} />
      <CategoriesTable type="expense" rows={data.expenseRows} />
    </div>
  );
}
