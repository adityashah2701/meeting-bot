import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";

export const add = mutation({
  args: {
    meetingId: v.id("meetings"),
    text: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
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

export const addBatch = mutation({
  args: {
    meetingId: v.id("meetings"),
    entries: v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    const speakerName =
      participant?.name ?? identity.name ?? identity.email ?? "Participant";
    const speakerId = participant?._id ?? identity.subject;
    const entries = args.entries
      .map((entry) => ({
        text: entry.text.trim(),
        timestamp: entry.timestamp,
      }))
      .filter((entry) => entry.text);

    if (entries.length === 0) {
      return 0;
    }

    const now = Date.now();

    for (const entry of entries) {
      await ctx.db.insert("transcripts", {
        meetingId: args.meetingId,
        speakerParticipantId: participant?._id,
        speakerId,
        speakerName,
        text: entry.text,
        timestamp: entry.timestamp,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.meetingId, {
      lastActivityAt: now,
    });

    return entries.length;
  },
});

export const list = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_timestamp", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("asc")
      .take(200);
  },
});
