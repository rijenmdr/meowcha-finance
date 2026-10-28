import { SourcesContainer } from "@/components/containers/sources/sources-container";
import { getSourcesPage } from "@/lib/queries/source";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function SourcesPage({ searchParams }: PageProps<"/sources">) {
  const data = await getSourcesPage(toSearchParams(await searchParams));

  return <SourcesContainer data={data} />;
}
