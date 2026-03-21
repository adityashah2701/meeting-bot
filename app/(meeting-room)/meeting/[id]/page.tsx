import type { Metadata } from "next";
import type { Id } from "@/convex/_generated/dataModel";
import { MeetingRoomPage } from "@/features/meeting/components/meeting-room-page";
import { createMeetingMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return createMeetingMetadata(`Meeting ${id}`, "Join the realtime meeting room with chat, participants, and AI insights.");
}

export default async function MeetingRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingRoomPage meetingId={id as Id<"meetings">} />;
}
