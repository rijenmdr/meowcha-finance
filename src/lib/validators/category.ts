import "server-only";
import type { Category } from "@/models/category";
import { id, obj, str, txnType } from "./shared";

export function parseCategory(value: unknown): Category {
  const v = obj(value, "category");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
    type: txnType(v.type),
  };
}
