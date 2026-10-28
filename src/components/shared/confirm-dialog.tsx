"use client";

import { CornerBrackets } from "./corner-brackets";
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
import { useConfirmStore } from "@/stores/use-confirm-store";

// Rendered once by the dashboard layout. confirm() and notify() from the store open it.
export function ConfirmDialog() {
  const request = useConfirmStore((state) => state.request);
  const settle = useConfirmStore((state) => state.settle);

  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && settle(false)}>
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
                <AlertDialogCancel>{request.cancelLabel ?? "Cancel"}</AlertDialogCancel>
                <AlertDialogAction variant={request.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
                  {request.confirmLabel ?? "Confirm"}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => settle(true)}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
