import { PageSkeleton } from "@/components/DashboardSkeleton";

// Shown inside the layout (Header stays) while a page runs its own queries.
export default function DashboardPageLoading() {
  return <PageSkeleton />;
}
