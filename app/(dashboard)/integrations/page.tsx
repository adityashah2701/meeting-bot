import { IntegrationsPage } from "@/features/integrations/components/integrations-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Integrations", "Review organization integrations and connection status.");

export default function IntegrationsRoute() {
  return <IntegrationsPage />;
}
