"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { NAV_SECTIONS } from "@/constants/navigation";
import { pickDateFilterSearch } from "@/lib/helpers/date-filter";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const navLinkClass =
  "flex cursor-pointer items-center gap-2.5 border-l-2 border-transparent px-2.5 py-2.25 text-14 text-ink no-underline hover:not-aria-[current=page]:bg-ink/5 aria-[current=page]:border-accent-500 aria-[current=page]:bg-accent-500/8 aria-[current=page]:font-semibold aria-[current=page]:text-accent-700";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // Carry the date filter between pages, the way the Header's Period select sets it.
  const filterSearch = pickDateFilterSearch(useSearchParams());

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex w-59 flex-none flex-col overflow-y-auto border-r border-line bg-surface py-5">
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-line px-5 pb-5">
        <Logo className="size-9" />
        <div>
          <div className="font-condensed text-20 font-semibold tracking-[-0.01em]">Meowcha</div>
          <div className="mt-0.75 text-11 tracking-widest text-accent-500 uppercase">Finance</div>
        </div>
      </div>
      <nav className="flex flex-col gap-4.5 px-2.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label ?? "top"} className="flex flex-col gap-0.5">
            {section.label && <div className="px-3 pb-1.5 text-10 tracking-widest text-ink/50 uppercase">{section.label}</div>}
            {section.items.map((item) => (
              <Link key={item.href} href={item.href + filterSearch} aria-current={pathname === item.href ? "page" : undefined} className={navLinkClass}>
                <item.icon size={16} strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-line px-5 pt-3.5 text-11 text-ink/55">
        {userEmail && <div className="mb-2 break-all">{userEmail}</div>}
        <Button variant="link" onClick={handleLogout} className="mb-2.5 font-sans text-11 font-normal hover:text-accent-500">
          Sign out
        </Button>
      </div>
    </div>
  );
}
