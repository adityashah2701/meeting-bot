import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Dashboard", "Monitor live meetings, summaries, and action items in your workspace.");

export default function DashboardRoute() {
  return <DashboardPage />;
}
