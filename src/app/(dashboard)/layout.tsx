import { Suspense, type CSSProperties, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { FinanceProvider } from "@/lib/finance-context";
import { getDashboardData } from "@/lib/data";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { TopNav } from "@/components/TopNav";
import { DialogHost } from "@/components/DialogHost";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

// Split out so the Suspense boundary in the layout can stream TopNav + Sidebar
// straight away and show a skeleton while the Supabase queries run.
async function DashboardContent({ children }: { children: ReactNode }) {
  const { transactions, budgets, invoices, customers, categories, channels, sources, products, orders, deliveryProviders, paymentMethods } =
    await getDashboardData();

  return (
    <FinanceProvider
      initialTransactions={transactions}
      initialBudgets={budgets}
      initialInvoices={invoices}
      initialCustomers={customers}
      initialCategories={categories}
      initialChannels={channels}
      initialSources={sources}
      initialProducts={products}
      initialOrders={orders}
      initialDeliveryProviders={deliveryProviders}
      initialPaymentMethods={paymentMethods}
    >
      <div className="max-w-310 min-w-0 flex-1 px-9 pt-7 pb-15">
        <Header />
        {children}
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
    <SidebarProvider
      defaultOpen
      className="bg-canvas font-sans text-15 text-ink"
      style={{ "--sidebar-width": "14.75rem", "--sidebar-width-mobile": "18rem" } as CSSProperties}
    >
      <Sidebar userEmail={userEmail} />
      <SidebarInset className="min-h-screen bg-canvas">
        <TopNav userEmail={userEmail} />
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent>{children}</DashboardContent>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
