export interface SearchParamsLike {
  get(name: string): string | null;
}

// What a page receives as `searchParams`.
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toSearchParams(record: SearchParamsRecord): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value) && value.length > 0) out.set(key, value[0]);
  }
  return out;
}
