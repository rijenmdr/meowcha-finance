"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseProductCategory } from "@/lib/validators/product-category";
import type { ProductCategory } from "@/models/product-category";

export async function saveProductCategoryAction(input: ProductCategory): Promise<void> {
  await requireSession();
  const category = parseProductCategory(input);
  const { error } = await getSupabase().from("product_categories").upsert(category);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteProductCategoryAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("product_categories").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
