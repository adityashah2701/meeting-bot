import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";

export const saveChunk = mutation({
  args: {
    meetingId: v.id("meetings"),
    chunkIndex: v.number(),
    summary: v.string(),
    key_points: v.array(v.string()),
    decisions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    const existing = await ctx.db
      .query("summary_chunks")
      .withIndex("by_meetingId_and_chunkIndex", (q) =>
        q.eq("meetingId", args.meetingId).eq("chunkIndex", args.chunkIndex),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        summary: args.summary,
        key_points: args.key_points,
        decisions: args.decisions,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("summary_chunks", {
      meetingId: args.meetingId,
      chunkIndex: args.chunkIndex,
      summary: args.summary,
      key_points: args.key_points,
      decisions: args.decisions,
      createdAt: Date.now(),
    });
  },
});

export const listChunks = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("summary_chunks")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .order("asc")
      .take(50);
  },
});
