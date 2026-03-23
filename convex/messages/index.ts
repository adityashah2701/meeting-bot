import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";
import { hasMeetingPermission } from "../lib/meetingPermissions";

export const list = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!participant || participant.status !== "joined") {
      throw new Error("Join the meeting before reading chat");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_meetingId_and_createdAt", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("desc")
      .take(100);
  },
});

export const send = mutation({
  args: {
    meetingId: v.id("meetings"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!participant || participant.status !== "joined") {
      throw new Error("Join the meeting before sending messages");
    }

    if (!hasMeetingPermission(meeting, participant, "canSendChat")) {
      throw new Error("Chat is disabled for you right now");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      meetingId: args.meetingId,
      senderParticipantId: participant._id,
      senderName: participant.name,
      body: args.body.trim(),
      createdAt: now,
    });

    await ctx.db.patch(args.meetingId, {
      lastActivityAt: now,
    });

    return messageId;
  },
});
