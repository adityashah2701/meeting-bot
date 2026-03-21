import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./lib/auth";
import { getMeetingParticipant } from "./lib/meetinghelpers";

export const listForParticipant = query({
  args: {
    meetingId: v.id("meetings"),
    participantId: v.id("meeting_participants"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_receiverParticipantId_and_createdAt", (q) =>
        q.eq("receiverParticipantId", args.participantId),
      )
      .order("desc")
      .take(200);
  },
});

export const send = mutation({
  args: {
    meetingId: v.id("meetings"),
    receiverParticipantId: v.id("meeting_participants"),
    kind: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate"),
      v.literal("renegotiate"),
    ),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const sender = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!sender) {
      throw new Error("Join the meeting before sending signaling events");
    }

    return await ctx.db.insert("signals", {
      meetingId: args.meetingId,
      senderParticipantId: sender._id,
      receiverParticipantId: args.receiverParticipantId,
      kind: args.kind,
      payload: args.payload,
      createdAt: Date.now(),
    });
  },
});
