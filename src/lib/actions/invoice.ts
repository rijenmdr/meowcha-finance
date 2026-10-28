"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseInvoice } from "@/lib/validators/invoice";
import type { Invoice } from "@/models/invoice";

export async function saveInvoiceAction(input: Invoice): Promise<void> {
  await requireSession();
  const invoice = parseInvoice(input);
  const { error } = await getSupabase()
    .from("invoices")
    .upsert({
      id: invoice.id,
      customer_id: invoice.customerId,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      amount: invoice.amount,
      paid: invoice.paid,
    });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteInvoiceAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("invoices").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
