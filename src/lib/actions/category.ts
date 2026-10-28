"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseCategory } from "@/lib/validators/category";
import type { Category } from "@/models/category";

export async function saveCategoryAction(input: Category): Promise<void> {
  await requireSession();
  const category = parseCategory(input);
  const { error } = await getSupabase().from("categories").upsert(category);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("categories").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
