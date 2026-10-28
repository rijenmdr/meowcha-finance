import "server-only";
import type { Budget } from "@/models/budget";
import { id, num, obj } from "./shared";

export function parseBudget(value: unknown): Budget {
  const v = obj(value, "budget");
  return {
    id: id(v.id),
    categoryId: id(v.categoryId, "categoryId"),
    target: num(v.target, "target"),
  };
}
