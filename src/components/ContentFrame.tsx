"use client";

import type { ReactNode } from "react";
import { useFinance } from "@/lib/finance-context";
import { cn } from "@/lib/utils";

// Dims the page while a date, filter, sort or page change loads on the server.
export function ContentFrame({ children }: { children: ReactNode }) {
  const { isNavigating } = useFinance();
  return (
    <div aria-busy={isNavigating} className={cn("transition-opacity", isNavigating && "opacity-60")}>
      {children}
    </div>
  );
}
