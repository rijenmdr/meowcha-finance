import "server-only";
import type { TxnType } from "@/enums/txn-type";
import type { Channel } from "@/models/channel";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { plural } from "@/lib/utils/plural";

export async function getChannels(): Promise<Channel[]> {
  const { data, error } = await getSupabase()
    .from("channels")
    .select("id, name, type")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type ChannelSummary = { id: string; name: string; type: TxnType; txn_count: number }[];

export async function getChannelsPage() {
  const channels = await rpc<ChannelSummary>("channel_summary");
  const rows = (type: TxnType) =>
    channels
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, usageCount: c.txn_count, usageLabel: plural(c.txn_count, "transaction") }));
  return { incomeRows: rows("income"), expenseRows: rows("expense") };
}
