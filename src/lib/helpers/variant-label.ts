// A variant's option values in the product's option order, e.g. "Olive, Lined".
export function variantLabel(optionNames: string[], options: Record<string, string>): string {
  return optionNames.map((n) => options[n]).filter(Boolean).join(", ");
}
