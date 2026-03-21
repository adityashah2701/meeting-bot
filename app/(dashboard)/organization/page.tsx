import { OrganizationPage } from "@/features/organization/components/organization-page";
import { createMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return createMetadata(
    "Organization",
    "Manage members, roles, and workspace integrations.",
  );
}

export default function OrganizationRoute() {
  return <OrganizationPage />;
}
