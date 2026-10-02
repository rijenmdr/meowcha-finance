import { cx } from "@/lib/cx";

const POSITIONS = ["-top-1.5 -left-1.5", "-top-1.5 -right-1.5", "-bottom-1.5 -left-1.5", "-bottom-1.5 -right-1.5"];

// The little dashed corner marks decorating every card/panel in the source design.
export function CornerBrackets({ className = "text-ink/55" }: { className?: string }) {
  return (
    <>
      {POSITIONS.map((pos) => (
        <svg key={pos} width="11" height="11" viewBox="0 0 11 11" className={cx("absolute", pos, className)} fill="none">
          <line x1="5.5" y1="0" x2="5.5" y2="11" stroke="currentColor" />
          <line x1="0" y1="5.5" x2="11" y2="5.5" stroke="currentColor" />
        </svg>
      ))}
    </>
  );
}
