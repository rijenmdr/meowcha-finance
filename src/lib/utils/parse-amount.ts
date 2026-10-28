// A number input's value as a number; blank or invalid reads as 0.
export function parseAmount(value: string): number {
  return parseFloat(value) || 0;
}
