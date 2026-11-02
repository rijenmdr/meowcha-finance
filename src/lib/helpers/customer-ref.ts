import type { NamedRef } from "@/models/picker";

export function customerRef(id: string | null, name: string | null): NamedRef | null {
  return id && name ? { id, name } : null;
}
