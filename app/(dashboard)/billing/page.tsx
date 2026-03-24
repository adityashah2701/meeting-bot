import { BillingPage } from "@/features/billing/components/billing-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata(
  "Billing",
  "Manage workspace billing, plan limits, and premium collaboration features.",
);

export default function BillingRoute() {
  return <BillingPage />;
}
