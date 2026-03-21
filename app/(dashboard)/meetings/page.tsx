import { MeetingsPage } from "@/features/meeting/components/meetings-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Meetings", "Browse every scheduled, live, and completed meeting in your organization.");

export default function MeetingsRoute() {
  return <MeetingsPage />;
}
