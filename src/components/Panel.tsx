import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CornerBrackets } from "./CornerBrackets";

export function Panel({ children, className, tinted }: { children: ReactNode; className?: string; tinted?: boolean }) {
  return (
    <div className={cx("relative border border-line", tinted && "bg-accent-500/6", className)}>
      <CornerBrackets />
      {children}
    </div>
  );
}
