import { OverviewContainer } from "@/components/containers/overview/overview-container";
import { getOverviewPage } from "@/lib/queries/overview";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function OverviewPage({ searchParams }: PageProps<"/overview">) {
  const data = await getOverviewPage(toSearchParams(await searchParams));

  return <OverviewContainer data={data} />;
}
