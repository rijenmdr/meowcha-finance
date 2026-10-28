"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseChannel } from "@/lib/validators/channel";
import type { Channel } from "@/models/channel";

export async function saveChannelAction(input: Channel): Promise<void> {
  await requireSession();
  const channel = parseChannel(input);
  const { error } = await getSupabase().from("channels").upsert(channel);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteChannelAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("channels").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
