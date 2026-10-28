import { PageSkeleton } from "@/components/shared/layout/dashboard-skeleton";

// Shown inside the layout (Header stays) while a page runs its own queries.
export default function DashboardPageLoading() {
  return <PageSkeleton />;
}
