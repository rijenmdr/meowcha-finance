"use client";

import { useDashboardData } from "@/lib/finance-context";
import { ChannelsTable } from "@/components/ChannelsTable";

export default function ChannelsPage() {
  const data = useDashboardData();

  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <ChannelsTable type="income" rows={data.incomeChannelRows} />
      <ChannelsTable type="expense" rows={data.expenseChannelRows} />
    </div>
  );
}
