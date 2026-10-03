import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Card } from "@/components/ui/card";

export function Panel({ children, className, tinted }: { children: ReactNode; className?: string; tinted?: boolean }) {
  return (
    <Card
      className={cx(
        "gap-0 rounded-none border border-line bg-canvas py-0 text-ink shadow-card ring-0",
        tinted && "bg-accent-500/6",
        className,
      )}
    >
      {children}
    </Card>
  );
}
