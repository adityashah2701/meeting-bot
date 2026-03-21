import { InsightsPage } from "@/features/ai/components/insights-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Insights", "Review meeting analytics and workspace activity trends.");

export default function InsightsRoute() {
  return <InsightsPage />;
}
