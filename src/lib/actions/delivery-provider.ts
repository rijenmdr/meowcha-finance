"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseDeliveryProvider } from "@/lib/validators/delivery-provider";
import type { DeliveryProvider } from "@/models/delivery-provider";

export async function saveDeliveryProviderAction(input: DeliveryProvider): Promise<void> {
  await requireSession();
  const provider = parseDeliveryProvider(input);
  const { error } = await getSupabase().from("delivery_providers").upsert(provider);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteDeliveryProviderAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("delivery_providers").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
