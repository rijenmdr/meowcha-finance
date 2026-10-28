export interface DeltaBits {
  label: string;
  colorClass: string;
  arrow: string;
}

// goodIsUp: whether an increase counts as a positive change (income/net) or
// a negative one (expenses, where "up" is bad).
export function deltaPct(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function deltaBits(cur: number, prev: number, goodIsUp: boolean): DeltaBits {
  const pct = deltaPct(cur, prev);
  const up = pct >= 0;
  const good = goodIsUp ? up : !up;
  return {
    label: (up ? "+" : "") + pct.toFixed(1) + "%",
    colorClass: good ? "text-accent-600" : "text-muted-foreground",
    arrow: up ? "M7 7h10v10 M7 17 17 7" : "m7 7 10 10 M17 7v10H7",
  };
}
