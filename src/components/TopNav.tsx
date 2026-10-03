"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
    <div className="flex h-13 flex-none items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="rounded-none border border-line bg-canvas text-ink hover:bg-mist md:hidden" />
        <div className="hidden font-condensed text-13 tracking-[0.18em] text-ink/50 uppercase sm:block">Meowcha Finance</div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-9 rounded-full border border-line bg-canvas hover:bg-mist" />}>
          <Avatar>
            <AvatarFallback className="bg-accent-500 font-condensed font-semibold text-canvas">{initial}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 border border-line bg-canvas text-ink ring-0">
          <DropdownMenuLabel className="px-2 py-2 text-12 break-all text-ink/60">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-line-soft" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleSignOut} className="font-semibold text-ink">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
