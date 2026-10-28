"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseTransaction } from "@/lib/validators/transaction";
import type { Transaction } from "@/models/transaction";

export async function saveTransactionAction(input: Transaction): Promise<void> {
  await requireSession();
  const { categoryId, channelId, sourceId, customerId, orderId, ...row } = parseTransaction(input);
  const { error } = await getSupabase()
    .from("transactions")
    .upsert({
      ...row,
      category_id: categoryId,
      channel_id: channelId,
      source_id: sourceId,
      customer_id: customerId,
      order_id: orderId,
    });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteTransactionAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("transactions").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
