import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  // For when "Cancel" would be ambiguous, e.g. when the action itself cancels something.
  cancelLabel?: string;
  destructive?: boolean;
}

export interface NotifyOptions {
  title: string;
  description?: string;
}

export interface ConfirmRequest extends ConfirmOptions {
  kind: "confirm" | "notify";
}

interface ConfirmState {
  request: ConfirmRequest | null;
  resolve: ((ok: boolean) => void) | null;
  open: (request: ConfirmRequest) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  resolve: null,
  open: (request) => {
    // A second request replaces an open one, which counts as cancelled.
    get().resolve?.(false);
    return new Promise<boolean>((resolve) => set({ request, resolve }));
  },
  settle: (ok) => {
    get().resolve?.(ok);
    set({ request: null, resolve: null });
  },
}));

// Promise-based replacements for window.confirm / window.alert, rendered by
// ConfirmDialog. confirm resolves true only when the action button is pressed.
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open({ ...options, kind: "confirm" });
}

// Resolves when the notice is dismissed.
export async function notify(options: NotifyOptions): Promise<void> {
  await useConfirmStore.getState().open({ ...options, kind: "notify" });
}
