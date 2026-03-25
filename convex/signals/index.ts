import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";

export const listForParticipant = query({
  args: {
    meetingId: v.id("meetings"),
    participantId: v.id("meeting_participants"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    const participant = await ctx.db.get(args.participantId);
    if (
      !participant ||
      participant.meetingId !== args.meetingId ||
      participant.userTokenIdentifier !== identity.tokenIdentifier ||
      participant.status !== "joined"
    ) {
      return [];
    }

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
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const sender = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!sender || sender.status !== "joined") {
      throw new Error("Join the meeting before sending signaling events");
    }

    const receiver = await ctx.db.get(args.receiverParticipantId);
    if (!receiver || receiver.meetingId !== args.meetingId || receiver.status !== "joined") {
      throw new Error("Invalid signal receiver");
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

export const clear = mutation({
  args: {
    signalIds: v.array(v.id("signals")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    for (const signalId of args.signalIds) {
      const signal = await ctx.db.get(signalId);
      if (!signal) {
        continue;
      }

      const receiver = await ctx.db.get(signal.receiverParticipantId);
      if (
        receiver &&
        receiver.userTokenIdentifier === identity.tokenIdentifier
      ) {
        await ctx.db.delete(signalId);
      }
    }

    return args.signalIds.length;
  },
});
