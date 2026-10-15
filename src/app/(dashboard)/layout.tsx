import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { FinanceProvider } from "@/lib/finance-context";
import { getLookups } from "@/lib/data";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { TopNav } from "@/components/TopNav";
import { DialogHost } from "@/components/DialogHost";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ContentFrame } from "@/components/ContentFrame";

export const dynamic = "force-dynamic";

// Split out so the Suspense boundary in the layout can stream TopNav + Sidebar
// straight away and show a skeleton while the lookup tables load. Each page
// queries its own records and totals.
async function DashboardContent({ children }: { children: ReactNode }) {
  const lookups = await getLookups();

  return (
    <FinanceProvider lookups={lookups}>
      <div className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
        <Header />
        <ContentFrame>{children}</ContentFrame>
      </div>
      <DialogHost />
    </FinanceProvider>
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // proxy.ts already gates these routes; this keeps the data load safe if the
  // proxy matcher ever changes or is bypassed.
  const user = await requireSupabaseUser().catch(() => null);
  if (!user) redirect("/login");
  const userEmail = user.email;
  if (!userEmail) redirect("/login");

  return (
    // The shell is exactly one viewport tall and only <main> scrolls, so the
    // top bar and sidebar stay in place while the content moves.
    <div className="flex h-svh flex-col overflow-hidden bg-canvas font-sans text-15 text-ink">
      <TopNav userEmail={userEmail} />
      <div className="flex min-h-0 flex-1">
        <Sidebar userEmail={userEmail} />
        <main className="flex min-w-0 flex-1 overflow-y-auto">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent>{children}</DashboardContent>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
