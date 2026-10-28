import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { LookupsProvider } from "@/components/shared/lookups-provider";
import { getLookups } from "@/lib/queries/lookups";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/shared/layout/sidebar";
import { Header } from "@/components/shared/layout/header";
import { TopNav } from "@/components/shared/layout/top-nav";
import { DialogHost } from "@/components/shared/dialogs/dialog-host";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DashboardSkeleton } from "@/components/shared/layout/dashboard-skeleton";
import { ContentFrame } from "@/components/shared/layout/content-frame";

export const dynamic = "force-dynamic";

// Split out so the Suspense boundary in the layout can stream TopNav + Sidebar
// straight away and show a skeleton while the lookup tables load. Each page
// queries its own records and totals.
async function DashboardContent({ children }: { children: ReactNode }) {
  const lookups = await getLookups();

  return (
    <LookupsProvider lookups={lookups}>
      <div className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
        <Header />
        <ContentFrame>{children}</ContentFrame>
      </div>
      <DialogHost />
      <ConfirmDialog />
    </LookupsProvider>
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
