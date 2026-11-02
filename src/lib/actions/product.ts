"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseProduct, parseVariantSearch } from "@/lib/validators/product";
import { searchVariants } from "@/lib/queries/product";
import type { PickerPage } from "@/models/picker";
import type { Product, VariantOption } from "@/models/product";

// The order editor's product picker searches as you type. Nothing changes, so no refresh().
export async function searchVariantsAction(
  search: string,
  page: number,
  excludeIds: string[],
  outOfStockOnly: boolean,
): Promise<PickerPage<VariantOption>> {
  await requireSession();
  const input = parseVariantSearch(search, page, excludeIds, outOfStockOnly);
  return searchVariants(input.search, input.page, input.excludeIds, input.outOfStockOnly);
}

// Returns a message when the name is taken (products_name_key is unique per lower-cased name).
export async function saveProductAction(input: Product): Promise<string | null> {
  await requireSession();
  const product = parseProduct(input);
  // An RPC so the product and its variants save atomically.
  const { error } = await getSupabase().rpc("save_product", {
    p_product: { id: product.id, name: product.name, category_id: product.categoryId, option_names: product.optionNames },
    p_variants: product.variants.map((v) => ({ id: v.id, options: v.options, quantity: v.quantity, price: v.price })),
  });
  if (error?.code === "23505" && error.message.includes("products_name_key")) {
    return `"${product.name}" already exists. Add a variant to that product instead.`;
  }
  if (error) throw new Error(error.message);
  refresh();
  return null;
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("products").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
