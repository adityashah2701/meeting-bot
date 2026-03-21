import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const add = mutation({
  args: {
    meetingId: v.id("meetings"),
    speakerId: v.string(),
    speakerName: v.string(),
    text: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    await ctx.db.insert("transcripts", {
      meetingId: args.meetingId,
      speakerId: args.speakerId, // Or identity.subject if strictly authenticating
      speakerName: args.speakerName,
      text: args.text,
      timestamp: args.timestamp,
    });
  },
});

export const list = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .order("asc")
      .collect();
  },
});
