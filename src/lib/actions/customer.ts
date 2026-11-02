"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseCustomer } from "@/lib/validators/customer";
import { searchCustomers } from "@/lib/queries/customer";
import { searchPage } from "@/lib/validators/shared";
import type { Customer, CustomerOption } from "@/models/customer";
import type { PickerPage } from "@/models/picker";

// The customer picker searches as you type. Nothing changes, so no refresh().
export async function searchCustomersAction(search: string, page: number): Promise<PickerPage<CustomerOption>> {
  await requireSession();
  const input = searchPage(search, page);
  return searchCustomers(input.search, input.page);
}

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
