import "server-only";
import type { ProductCategory } from "@/models/product-category";
import { id, obj, str } from "./shared";

export function parseProductCategory(value: unknown): ProductCategory {
  const v = obj(value, "product category");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }).trim(),
  };
}
