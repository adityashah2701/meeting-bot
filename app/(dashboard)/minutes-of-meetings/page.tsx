import { MinutesOfMeetingsPage } from "@/features/meeting/components/minutes-of-meetings-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata(
  "Minutes of Meetings",
  "Browse and download professional minutes of meeting documents for your workspace.",
);

export default function MinutesOfMeetingsRoute() {
  return <MinutesOfMeetingsPage />;
}
