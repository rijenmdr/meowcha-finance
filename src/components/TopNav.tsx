"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function TopNav({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const email = userEmail;
  const initial = email ? email[0]!.toUpperCase() : "?";

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-13 flex-none items-center justify-end border-b border-line bg-surface px-6">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-accent-500 p-0 font-condensed text-14 font-semibold text-canvas"
        >
          {initial}
        </button>

        {open && (
          <div role="menu" className="absolute top-[calc(100%+8px)] right-0 z-20 min-w-50 border border-line bg-canvas shadow-menu">
            {email && <div className="border-b border-ink/12 px-3.5 py-2.5 text-12 break-all text-ink/60">{email}</div>}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left text-13 font-semibold text-ink hover:bg-accent-500/10"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
