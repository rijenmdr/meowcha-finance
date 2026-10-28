"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseBudget } from "@/lib/validators/budget";
import type { Budget } from "@/models/budget";

export async function saveBudgetAction(input: Budget): Promise<void> {
  await requireSession();
  const budget = parseBudget(input);
  const db = getSupabase();
  // The FK only proves the category exists; budgets are for expenses only.
  const { data: category, error: categoryError } = await db
    .from("categories")
    .select("type")
    .eq("id", budget.categoryId)
    .maybeSingle();
  if (categoryError) throw new Error(categoryError.message);
  if (category?.type !== "expense") throw new Error("Invalid categoryId");

  const { error } = await db.from("budgets").upsert({ id: budget.id, category_id: budget.categoryId, target: budget.target });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteBudgetAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("budgets").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
