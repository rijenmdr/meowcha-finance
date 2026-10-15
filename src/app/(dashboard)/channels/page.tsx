import { getChannelsPage } from "@/lib/page-data";
import { ChannelsTable } from "@/components/ChannelsTable";

export default async function ChannelsPage() {
  const data = await getChannelsPage();

  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <ChannelsTable type="income" rows={data.incomeRows} />
      <ChannelsTable type="expense" rows={data.expenseRows} />
    </div>
  );
}
