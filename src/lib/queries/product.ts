import "server-only";
import type { Product } from "@/models/product";
import { variantLabel } from "@/lib/helpers/variant-label";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/utils/format-money";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, name, category_id, option_names, product_variants (id, options, quantity, price)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    optionNames: row.option_names,
    variants: (row.product_variants ?? []).map((v: { id: string; options: Record<string, string>; quantity: number; price: number }) => ({
      id: v.id,
      options: v.options,
      quantity: v.quantity,
      price: v.price,
    })),
  }));
}

// Ids of the product's variants that are on an order, which save_product can't remove.
export async function getVariantIdsInUse(productId: string): Promise<string[]> {
  return rpc<string[]>("variants_in_use", { p_product_id: productId });
}

interface ProductSummary {
  units: number;
  stock_value: number;
  out_of_stock: number;
  rows: {
    id: string;
    name: string;
    category_id: string;
    category_name: string;
    option_names: string[];
    variants: { id: string; options: Record<string, string>; quantity: number; price: number }[];
    units: number;
    stock_value: number;
    order_count: number;
  }[];
}

export async function getProductsPage(params: URLSearchParams) {
  const filterCategory = params.get("category") || "all";
  const s = await rpc<ProductSummary>("product_summary", { p_category_id: filterCategory === "all" ? null : filterCategory });
  const rows = s.rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category_name,
    optionsLabel: p.option_names.join(", "),
    variantCount: p.variants.length,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: variantLabel(p.option_names, v.options) || "Default",
      quantityDisplay: String(v.quantity),
      quantityClass: v.quantity === 0 ? "text-error" : "text-ink",
      priceDisplay: fmtMoney(v.price),
    })),
    quantity: p.units,
    quantityDisplay: String(p.units),
    stockValue: p.stock_value,
    stockValueDisplay: fmtMoney(p.stock_value),
    orderCount: p.order_count,
  }));
  return {
    rows,
    filterCategory,
    productsEmpty: rows.length === 0,
    productCountDisplay: String(rows.length),
    unitsInStockDisplay: String(s.units),
    stockValueDisplay: fmtMoney(s.stock_value),
    outOfStockDisplay: String(s.out_of_stock),
  };
}
