"use client";

import { useCallback, useRef, useState } from "react";
import { CornerBrackets } from "./CornerBrackets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export interface NotifyOptions {
  title: string;
  description?: string;
}

interface DialogRequest extends ConfirmOptions {
  kind: "confirm" | "notify";
}

// Promise-based replacement for window.confirm / window.alert. The caller
// renders `dialog` once; `confirm` resolves true only when the action button
// is pressed, and `notify` resolves when the notice is dismissed.
export function useConfirmDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const open = useCallback((next: DialogRequest) => {
    // A second request replaces an open one, which counts as cancelled.
    resolveRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setRequest(next);
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => open({ ...options, kind: "confirm" }), [open]);
  const notify = useCallback(async (options: NotifyOptions) => {
    await open({ ...options, kind: "notify" });
  }, [open]);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  const dialog = <ConfirmDialog request={request} onSettle={settle} />;

  return { confirm, notify, dialog };
}

function ConfirmDialog({ request, onSettle }: { request: DialogRequest | null; onSettle: (ok: boolean) => void }) {
  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && onSettle(false)}>
      {request && (
        <AlertDialogContent>
          <CornerBrackets />
          <AlertDialogHeader>
            <AlertDialogTitle>{request.title}</AlertDialogTitle>
            {request.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {request.kind === "confirm" ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant={request.destructive ? "destructive" : "default"} onClick={() => onSettle(true)}>
                  {request.confirmLabel ?? "Confirm"}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => onSettle(true)}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
