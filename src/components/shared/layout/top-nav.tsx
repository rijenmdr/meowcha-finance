"use client";

import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function TopNav({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const email = userEmail;
  const initial = email ? email[0]!.toUpperCase() : "?";

  async function handleSignOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-13 flex-none items-center justify-end border-b border-line bg-surface px-6">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-accent-500 p-0 font-condensed text-14 font-semibold text-canvas"
        >
          {initial}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-auto min-w-50">
          {email && <DropdownMenuLabel className="border-b border-ink/12 break-all">{email}</DropdownMenuLabel>}
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={handleSignOut} className="font-semibold">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
