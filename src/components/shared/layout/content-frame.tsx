"use client";

import type { ReactNode } from "react";
import { useNavigationStore } from "@/stores/use-navigation-store";
import { cn } from "@/lib/utils/cn";

// Dims the page while a date, filter, sort or page change loads on the server.
export function ContentFrame({ children }: { children: ReactNode }) {
  const isNavigating = useNavigationStore((state) => state.pendingCount > 0);
  return (
    <div aria-busy={isNavigating} className={cn("transition-opacity", isNavigating && "opacity-60")}>
      {children}
    </div>
  );
}
