import { ChannelsContainer } from "@/components/containers/channels/channels-container";
import { getChannelsPage } from "@/lib/queries/channel";

export default async function ChannelsPage() {
  const data = await getChannelsPage();

  return <ChannelsContainer data={data} />;
}
