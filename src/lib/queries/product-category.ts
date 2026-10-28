import "server-only";
import type { ProductCategory } from "@/models/product-category";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { plural } from "@/lib/utils/plural";

export async function getProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await getSupabase()
    .from("product_categories")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type ProductCategorySummary = { id: string; name: string; product_count: number }[];

export async function getProductCategoriesPage() {
  const categories = await rpc<ProductCategorySummary>("product_category_summary");
  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    usageCount: c.product_count,
    usageLabel: plural(c.product_count, "product"),
  }));
  return { rows, productCategoriesEmpty: rows.length === 0 };
}
