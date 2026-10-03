"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <>
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (
      <>
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
        <path d="M12 22V12" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="m7.5 4.27 9 5.15" />
      </>
    ),
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
  },
  {
    href: "/budget",
    label: "Budget",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </>
    ),
  },
  {
    href: "/categories",
    label: "Categories",
    icon: (
      <>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      </>
    ),
  },
  {
    href: "/channels",
    label: "Channels",
    icon: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
  },
  {
    href: "/sources",
    label: "Sources",
    icon: (
      <>
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </>
    ),
  },
  {
    href: "/delivery-providers",
    label: "Delivery providers",
    icon: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
  },
  {
    href: "/payment-methods",
    label: "Payment methods",
    icon: (
      <>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
  {
    href: "/products",
    label: "Products",
    icon: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      </>
    ),
  },
  {
    href: "/customers",
    label: "Customers",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
];

// Grouped by task: the at-a-glance view, money moving day to day, then the
// reference lists that feed those screens.
const NAV_SECTIONS: { label: string | null; hrefs: string[] }[] = [
  { label: null, hrefs: ["/overview"] },
  { label: "Money", hrefs: ["/orders", "/transactions", "/invoices", "/budget"] },
  { label: "Manage", hrefs: ["/products", "/customers", "/categories", "/channels", "/sources", "/delivery-providers", "/payment-methods"] },
];

const navLinkClass =
  "flex cursor-pointer items-center gap-2.5 border-l-2 border-transparent px-2.5 py-2.25 text-14 text-ink no-underline hover:not-aria-[current=page]:bg-ink/5 aria-[current=page]:border-accent-500 aria-[current=page]:bg-accent-500/8 aria-[current=page]:font-semibold aria-[current=page]:text-accent-700";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const email = userEmail;

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex w-59 flex-none flex-col border-r border-line bg-surface py-5">
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
            {NAV_ITEMS.filter((item) => section.hrefs.includes(item.href))
              .sort((a, b) => section.hrefs.indexOf(a.href) - section.hrefs.indexOf(b.href))
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={navLinkClass}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-line px-5 pt-3.5 text-11 text-ink/55">
        {email && <div className="mb-2 break-all">{email}</div>}
        <button type="button" onClick={handleLogout} className="mb-2.5 cursor-pointer border-none bg-transparent p-0 text-11 text-accent-500">
          Sign out
        </button>
      </div>
    </div>
  );
}
