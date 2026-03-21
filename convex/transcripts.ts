import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./lib/auth";
import { getMeetingParticipant } from "./lib/meetinghelpers";

export const add = mutation({
  args: {
    meetingId: v.id("meetings"),
    text: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    const speakerName =
      participant?.name ?? identity.name ?? identity.email ?? "Participant";
    const speakerId = participant?._id ?? identity.subject;

    await ctx.db.insert("transcripts", {
      meetingId: args.meetingId,
      speakerParticipantId: participant?._id,
      speakerId: speakerId,
      speakerName,
      text: args.text,
      timestamp: args.timestamp,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.meetingId, {
      lastActivityAt: Date.now(),
    });
  },
});

export const list = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_timestamp", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("asc")
      .take(200);
  },
});
