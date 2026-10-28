import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CornerBrackets } from "./corner-brackets";

export function Panel({ children, className, tinted }: { children: ReactNode; className?: string; tinted?: boolean }) {
  return (
    <div className={cn("relative border border-line", tinted && "bg-accent-500/6", className)}>
      <CornerBrackets />
      {children}
    </div>
  );
}
