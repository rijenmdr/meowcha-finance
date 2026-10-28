"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseCustomer } from "@/lib/validators/customer";
import type { Customer } from "@/models/customer";

export async function saveCustomerAction(input: Customer): Promise<void> {
  await requireSession();
  const customer = parseCustomer(input);
  const { error } = await getSupabase().from("customers").upsert(customer);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteCustomerAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("customers").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
