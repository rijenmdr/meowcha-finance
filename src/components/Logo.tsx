import { cx } from "@/lib/cx";

// Meowcha cat mark. Keep in sync with src/app/icon.svg (the favicon can't use classes).
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cx("flex-none", className)}>
      <rect width="32" height="32" className="fill-accent-500" />
      <path
        d="M8 21V10l3.5-4.5L15 9h2l3.5-3.5L24 10v11a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Z"
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="stroke-canvas"
      />
      <circle cx="12.5" cy="15" r="1.25" className="fill-canvas" />
      <circle cx="19.5" cy="15" r="1.25" className="fill-canvas" />
      <path d="M14.5 19l1.5 1 1.5-1" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-canvas" />
    </svg>
  );
}
