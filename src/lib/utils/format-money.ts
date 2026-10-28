export function fmtMoney(n: number): string {
  const neg = n < 0;
  // Nepali Rupees, grouped the South Asian way (lakh/crore): Rs 1,23,456.00
  const v = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "–" : "") + "Rs " + v;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
