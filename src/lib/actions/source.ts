"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseSource } from "@/lib/validators/source";
import type { Source } from "@/models/source";

export async function saveSourceAction(input: Source): Promise<void> {
  await requireSession();
  const source = parseSource(input);
  const { error } = await getSupabase().from("sources").upsert(source);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteSourceAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("sources").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
