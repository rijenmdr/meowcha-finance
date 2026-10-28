"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useDialogStore } from "@/stores/use-dialog-store";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { CornerBrackets } from "@/components/shared/corner-brackets";

// Radix wires aria-describedby itself when a DialogDescription renders; an
// explicit undefined tells it there is none instead of logging a warning.
const noDescription = { "aria-describedby": undefined };

// className carries the dialog's max width, e.g. "max-w-105" for 420px.
// onSubmit may return a promise: the dialog stays open, disabled and showing
// "Saving…" until it settles, and shows an error instead of closing if it rejects.
export function DialogOverlay({
  title,
  description,
  className,
  onSubmit,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  className: string;
  onSubmit: (fd: FormData) => Promise<void> | void;
  children: ReactNode;
}) {
  const closeDialog = useDialogStore((state) => state.close);
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
    // Escape and outside clicks close the dialog, except while a save is in flight.
    <Dialog open onOpenChange={(open) => !open && !pending && closeDialog()}>
      <DialogContent
        showCloseButton={false}
        {...(description ? {} : noDescription)}
        className={cn("max-h-[calc(100%-2.5rem)] overflow-y-auto", className)}
      >
        <CornerBrackets />
        <form onSubmit={handleSubmit} aria-busy={pending} className="min-w-0">
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3.5">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription className="text-13 text-foreground/60">{description}</DialogDescription>}

            <FieldGroup>{children}</FieldGroup>

            {error && (
              <div role="alert" className="text-13 text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {pending && (
                  <span aria-hidden data-icon="inline-start" className="size-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                )}
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Still used by the login page and ProductEditor, which haven't moved to
// the shadcn primitives yet. Remove once nothing imports them.
export const fieldLabelClass = "mb-1.25 block text-12 text-ink/70";

export const inputClass = "min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14";

export const fieldHintClass = "mt-1 text-11 text-ink/60";

export const dialogTitleClass = "font-condensed text-20 font-semibold";

export const cancelButtonClass =
  "cursor-pointer border border-line bg-transparent px-4 py-2 font-condensed text-14 font-semibold disabled:cursor-default disabled:opacity-70";

export const saveButtonClass =
  "cursor-pointer border border-accent-500 bg-accent-500 px-4 py-2 font-condensed text-14 font-semibold text-canvas disabled:cursor-default disabled:opacity-70";
