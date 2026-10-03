"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useFinance } from "@/lib/finance-context";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  function handleOpenChange(open: boolean) {
    if (!open && !pending) {
      closeDialog();
    }
  }

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
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cx(
          "w-full border border-line bg-canvas p-0 text-ink shadow-dialog ring-0 sm:max-w-[calc(100vw-2rem)]",
          className,
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Dialog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} aria-busy={pending} className="flex max-h-[calc(100vh-2.5rem)] flex-col overflow-hidden">
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3.5 overflow-y-auto p-6">
            {children}

            {error && (
              <div role="alert" className="text-13 text-error">
                {error}
              </div>
            )}

            <div className="mt-1.5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} className={cancelButtonClass}>
                Cancel
              </Button>
              <Button type="submit" className={cx(saveButtonClass, "inline-flex items-center gap-2")}>
                {pending && <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas" />}
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const fieldLabelClass = "mb-1.25 block text-13 font-medium text-ink/75";

export const inputClass =
  "flex min-h-9 w-full rounded-none border border-line bg-surface px-2.5 py-1.5 text-14 text-ink outline-none transition-colors placeholder:text-ink/45 focus-visible:border-accent-400 focus-visible:ring-3 focus-visible:ring-accent-400/20 disabled:cursor-not-allowed disabled:opacity-60";

export const fieldHintClass = "mt-1 text-11 text-ink/60";

export const dialogTitleClass = "font-condensed text-20 font-semibold";

const cancelButtonClass =
  "rounded-none border-line bg-transparent font-condensed text-14 font-semibold text-ink hover:bg-surface";

export const saveButtonClass =
  "rounded-none border-accent-500 bg-accent-500 font-condensed text-14 font-semibold text-canvas hover:bg-accent-600";
