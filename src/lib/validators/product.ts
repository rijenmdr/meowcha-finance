import "server-only";
import { MAX_PRODUCT_OPTIONS } from "@/constants/product";
import { roundMoney } from "@/lib/utils/format-money";
import type { Product, ProductVariant } from "@/models/product";
import { fail, id, num, obj, str } from "./shared";

export function parseProduct(value: unknown): Product {
  const v = obj(value, "product");
  if (!Array.isArray(v.optionNames) || v.optionNames.length > MAX_PRODUCT_OPTIONS) fail("optionNames");
  const optionNames = v.optionNames.map((n) => str(n, "optionNames", { max: 50, required: true }).trim());
  if (new Set(optionNames.map((n) => n.toLowerCase())).size !== optionNames.length) fail("optionNames");
  if (!Array.isArray(v.variants) || v.variants.length === 0 || v.variants.length > 100) fail("variants");
  const variants = v.variants.map((raw): ProductVariant => {
    const variant = obj(raw, "variant");
    const rawOptions = obj(variant.options, "options");
    const options: Record<string, string> = {};
    for (const name of optionNames) options[name] = str(rawOptions[name], name, { max: 100, required: true }).trim();
    const quantity = num(variant.quantity, "quantity");
    if (!Number.isInteger(quantity)) fail("quantity");
    return { id: id(variant.id), options, quantity, price: roundMoney(num(variant.price, "price")) };
  });
  const combos = new Set(variants.map((x) => optionNames.map((n) => x.options[n].toLowerCase()).join("\u0000")));
  if (combos.size !== variants.length) fail("variants");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 200, required: true }).trim(),
    categoryId: id(v.categoryId, "categoryId"),
    optionNames,
    variants,
  };
}
