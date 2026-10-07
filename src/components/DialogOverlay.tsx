"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useFinance } from "@/lib/finance-context";
import { cx } from "@/lib/cx";
import { CornerBrackets } from "./CornerBrackets";

// className carries the dialog's max width, e.g. "max-w-105" for 420px.
// onSubmit may return a promise: the dialog stays open, disabled and showing
// "Saving…" until it settles, and shows an error instead of closing if it rejects.
export function DialogOverlay({
  className,
  onSubmit,
  children,
}: {
  className: string;
  onSubmit: (fd: FormData) => Promise<void> | void;
  children: ReactNode;
}) {
  const { closeDialog } = useFinance();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(fd);
      } catch (err) {
        console.error("Failed to save", err);
        setError("Couldn't save. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-shade/50 p-5">
      <form
        onSubmit={handleSubmit}
        aria-busy={pending}
        className={cx("relative w-full border border-line bg-canvas p-6 shadow-dialog", className)}
      >
        <CornerBrackets />
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3.5">
          {children}

          {error && (
            <div role="alert" className="text-13 text-error">
              {error}
            </div>
          )}

          <div className="mt-1.5 flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className={cancelButtonClass}>
              Cancel
            </button>
            <button type="submit" className={cx(saveButtonClass, "inline-flex items-center gap-2")}>
              {pending && <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas" />}
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

export const fieldLabelClass = "mb-1.25 block text-12 text-ink/70";

export const inputClass = "min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14";

export const fieldHintClass = "mt-1 text-11 text-ink/60";

export const dialogTitleClass = "font-condensed text-20 font-semibold";

export const cancelButtonClass =
  "cursor-pointer border border-line bg-transparent px-4 py-2 font-condensed text-14 font-semibold disabled:cursor-default disabled:opacity-70";

export const saveButtonClass =
  "cursor-pointer border border-accent-500 bg-accent-500 px-4 py-2 font-condensed text-14 font-semibold text-canvas disabled:cursor-default disabled:opacity-70";
