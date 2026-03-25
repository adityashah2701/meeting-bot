import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";

const MAX_REACTIONS_PER_MEETING = 200;

function assertValidReaction(
  emoji: string,
): asserts emoji is "👍" | "❤️" | "👏" | "🎉" | "😂" | "😮" {
  if (
    emoji !== "👍" &&
    emoji !== "❤️" &&
    emoji !== "👏" &&
    emoji !== "🎉" &&
    emoji !== "😂" &&
    emoji !== "😮"
  ) {
    throw new Error("Unsupported reaction");
  }
}

export const listByMeeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    return await ctx.db
      .query("meeting_reactions")
      .withIndex("by_meetingId_and_createdAt", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("desc")
      .take(60);
  },
});

export const send = mutation({
  args: {
    meetingId: v.id("meetings"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    assertValidReaction(args.emoji);

    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(
      ctx,
      identity.tokenIdentifier,
      args.meetingId,
    );
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!participant || participant.status !== "joined") {
      throw new Error("Join the meeting before sending reactions");
    }

    if (!meeting.settings.allowReactions) {
      throw new Error("Reactions are disabled for this meeting");
    }

    const reactionId = await ctx.db.insert("meeting_reactions", {
      meetingId: args.meetingId,
      senderParticipantId: participant._id,
      senderName: participant.name,
      emoji: args.emoji,
      createdAt: Date.now(),
    });

    const recentReactions = await ctx.db
      .query("meeting_reactions")
      .withIndex("by_meetingId_and_createdAt", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("desc")
      .take(MAX_REACTIONS_PER_MEETING + 20);

    for (const staleReaction of recentReactions.slice(MAX_REACTIONS_PER_MEETING)) {
      await ctx.db.delete(staleReaction._id);
    }

    return reactionId;
  },
});
