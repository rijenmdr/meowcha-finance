import type { getChannelsPage } from "@/lib/queries/channel";
import { ChannelsTable } from "./channels-table";

type ChannelsPageData = Awaited<ReturnType<typeof getChannelsPage>>;

export function ChannelsContainer({ data }: { data: ChannelsPageData }) {
  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <ChannelsTable type="income" rows={data.incomeRows} />
      <ChannelsTable type="expense" rows={data.expenseRows} />
    </div>
  );
}
