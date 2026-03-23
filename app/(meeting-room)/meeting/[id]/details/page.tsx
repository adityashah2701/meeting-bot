import type { Metadata } from "next";
import type { Id } from "@/convex/_generated/dataModel";
import { MeetingDetailsPage } from "@/features/meeting/components/meeting-details-page";
import { createMeetingMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return createMeetingMetadata(
    `Meeting ${id}`,
    "Review transcript history and AI summary for this meeting.",
  );
}

export default async function MeetingDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetailsPage meetingId={id as Id<"meetings">} />;
}
