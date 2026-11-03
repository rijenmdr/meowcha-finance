import "server-only";
import type { Product, VariantOption } from "@/models/product";
import type { PickerPage } from "@/models/picker";
import { pickerArgs, toPickerPage } from "@/lib/helpers/picker-page";
import { variantLabel } from "@/lib/helpers/variant-label";
import { rpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/utils/format-money";

interface ProductRow {
  id: string;
  name: string;
  category_id: string;
  option_names: string[];
  product_variants: { id: string; options: Record<string, string>; quantity: number; price: number }[] | null;
}

// One product with its variants, for the product editor.
export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, name, category_id, option_names, product_variants (id, options, quantity, price)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as ProductRow;
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    optionNames: row.option_names,
    variants: (row.product_variants ?? []).map((v) => ({ id: v.id, options: v.options, quantity: v.quantity, price: v.price })),
  };
}

// The option names products already use (Color, Type…), offered when adding one.
export async function getProductOptionNames(): Promise<string[]> {
  const { data, error } = await getSupabase().from("products").select("option_names");
  if (error) throw new Error(error.message);
  const names = (data ?? []).flatMap((row: { option_names: string[] }) => row.option_names);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

interface VariantSearchRow {
  id: string;
  name: string;
  option_names: string[];
  options: Record<string, string>;
  price: number;
  quantity: number;
}

export function toVariantOption(row: VariantSearchRow): VariantOption {
  const details = variantLabel(row.option_names, row.options);
  return { id: row.id, name: row.name, details, label: details ? `${row.name} · ${details}` : row.name, price: row.price, quantity: row.quantity };
}

export async function searchVariants(search: string, page: number, excludeIds: string[], outOfStockOnly: boolean): Promise<PickerPage<VariantOption>> {
  const rows = await rpc<VariantSearchRow[]>("search_variants", {
    ...pickerArgs(search, page),
    p_out_of_stock_only: outOfStockOnly,
    p_exclude_ids: excludeIds,
  });
  return toPickerPage(rows, toVariantOption);
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
