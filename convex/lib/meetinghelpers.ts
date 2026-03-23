import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { MeetingParticipantStatus } from "./meetingPermissions";

type ConvexCtx = QueryCtx | MutationCtx;

export async function getMeetingParticipant(
  ctx: ConvexCtx,
  meetingId: Id<"meetings">,
  userTokenIdentifier: string,
) {
  return await ctx.db
    .query("meeting_participants")
    .withIndex("by_meetingId_and_userTokenIdentifier", (q) =>
      q
        .eq("meetingId", meetingId)
        .eq("userTokenIdentifier", userTokenIdentifier),
    )
    .unique();
}

export async function listActiveParticipants(
  ctx: ConvexCtx,
  meetingId: Id<"meetings">,
) {
  return await listMeetingParticipantsByStatus(ctx, meetingId, "joined");
}

export async function listMeetingParticipantsByStatus(
  ctx: ConvexCtx,
  meetingId: Id<"meetings">,
  status: MeetingParticipantStatus,
) {
  return await ctx.db
    .query("meeting_participants")
    .withIndex("by_meetingId_and_status", (q) =>
      q.eq("meetingId", meetingId).eq("status", status),
    )
    .order("desc")
    .take(200);
}

export async function listAllMeetingParticipants(
  ctx: ConvexCtx,
  meetingId: Id<"meetings">,
) {
  const grouped = await Promise.all([
    listMeetingParticipantsByStatus(ctx, meetingId, "joined"),
    listMeetingParticipantsByStatus(ctx, meetingId, "waiting"),
    listMeetingParticipantsByStatus(ctx, meetingId, "left"),
    listMeetingParticipantsByStatus(ctx, meetingId, "removed"),
    listMeetingParticipantsByStatus(ctx, meetingId, "rejected"),
  ]);

  return grouped.flat();
}

export function getMeetingDuration(meeting: Doc<"meetings">) {
  if (!meeting.startedAt) {
    return 0;
  }

  const endTime = meeting.endedAt ?? Date.now();
  return Math.max(0, endTime - meeting.startedAt);
}
