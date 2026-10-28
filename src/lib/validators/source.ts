import "server-only";
import type { Source } from "@/models/source";
import { id, obj, str } from "./shared";

export function parseSource(value: unknown): Source {
  const v = obj(value, "source");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}
