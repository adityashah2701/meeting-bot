import { SettingsPage } from "@/features/organization/components/settings-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Settings", "Manage your account profile and personal preferences.");

export default function SettingsRoute() {
  return <SettingsPage />;
}
