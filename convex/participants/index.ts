import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getIdentityName, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";

export const join = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const meeting = await ctx.db.get(args.meetingId);

    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (
      meeting.status === "scheduled" &&
      typeof meeting.scheduledFor === "number" &&
      meeting.scheduledFor <= now
    ) {
      await ctx.db.patch(args.meetingId, {
        status: "active",
        startedAt: meeting.startedAt ?? now,
        lastActivityAt: now,
      });
    }

    const existing = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "joined",
        leftAt: undefined,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("meeting_participants", {
      meetingId: args.meetingId,
      userTokenIdentifier: identity.tokenIdentifier,
      clerkId: identity.subject,
      name: getIdentityName(identity),
      imageUrl: identity.pictureUrl,
      status: "joined",
      joinedAt: now,
      lastSeenAt: now,
      isMicEnabled: true,
      isCameraEnabled: true,
      isScreenSharing: false,
    });
  },
});

export const leave = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    if (!participant) {
      return null;
    }

    await ctx.db.patch(participant._id, {
      status: "left",
      leftAt: Date.now(),
      isScreenSharing: false,
    });

    return participant._id;
  },
});

export const heartbeat = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    if (!participant) {
      return null;
    }

    await ctx.db.patch(participant._id, {
      lastSeenAt: Date.now(),
    });

    return participant._id;
  },
});

export const updateMedia = mutation({
  args: {
    meetingId: v.id("meetings"),
    isMicEnabled: v.boolean(),
    isCameraEnabled: v.boolean(),
    isScreenSharing: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, {
      isMicEnabled: args.isMicEnabled,
      isCameraEnabled: args.isCameraEnabled,
      isScreenSharing: args.isScreenSharing,
      lastSeenAt: Date.now(),
    });

    return participant._id;
  },
});

export const list = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meeting_participants")
      .withIndex("by_meetingId_and_status", (q) =>
        q.eq("meetingId", args.meetingId).eq("status", "joined"),
      )
      .order("desc")
      .take(20);
  },
});
