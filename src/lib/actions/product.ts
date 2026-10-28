"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";
import { id as parseId } from "@/lib/validators/shared";
import { parseProduct } from "@/lib/validators/product";
import type { Product } from "@/models/product";

export async function saveProductAction(input: Product): Promise<void> {
  await requireSession();
  const product = parseProduct(input);
  // An RPC so the product and its variants save atomically.
  const { error } = await getSupabase().rpc("save_product", {
    p_product: { id: product.id, name: product.name, category_id: product.categoryId, option_names: product.optionNames },
    p_variants: product.variants.map((v) => ({ id: v.id, options: v.options, quantity: v.quantity, price: v.price })),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireSession();
  const { error } = await getSupabase().from("products").delete().eq("id", parseId(id));
  if (error) throw new Error(error.message);
  refresh();
}
