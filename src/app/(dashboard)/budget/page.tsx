import { BudgetContainer } from "@/components/containers/budget/budget-container";
import { getBudgetPage } from "@/lib/queries/budget";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function BudgetPage({ searchParams }: PageProps<"/budget">) {
  const data = await getBudgetPage(toSearchParams(await searchParams));

  return <BudgetContainer data={data} />;
}
