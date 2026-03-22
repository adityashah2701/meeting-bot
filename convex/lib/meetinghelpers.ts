import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

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
  return await ctx.db
    .query("meeting_participants")
    .withIndex("by_meetingId_and_status", (q) =>
      q.eq("meetingId", meetingId).eq("status", "joined"),
    )
    .order("desc")
    .take(20);
}

export function getMeetingDuration(meeting: Doc<"meetings">) {
  if (!meeting.startedAt) {
    return 0;
  }

  const endTime = meeting.endedAt ?? Date.now();
  return Math.max(0, endTime - meeting.startedAt);
}
