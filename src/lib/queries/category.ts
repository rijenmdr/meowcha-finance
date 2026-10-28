import "server-only";
import type { TxnType } from "@/enums/txn-type";
import type { Category } from "@/models/category";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { plural } from "@/lib/utils/plural";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("id, name, type")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type CategorySummary = { id: string; name: string; type: TxnType; txn_count: number; budgeted: boolean }[];

export async function getCategoriesPage() {
  const categories = await rpc<CategorySummary>("category_summary");
  const rows = (type: TxnType) =>
    categories
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, usageCount: c.txn_count, usageLabel: plural(c.txn_count, "transaction"), budgeted: c.budgeted }));
  return { incomeRows: rows("income"), expenseRows: rows("expense") };
}
