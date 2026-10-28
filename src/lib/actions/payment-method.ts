"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parsePaymentMethod } from "@/lib/validators/payment-method";
import type { PaymentMethod } from "@/models/payment-method";

export async function savePaymentMethodAction(input: PaymentMethod): Promise<void> {
  await requireSession();
  const method = parsePaymentMethod(input);
  const { error } = await getSupabase().from("payment_methods").upsert(method);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deletePaymentMethodAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("payment_methods").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
