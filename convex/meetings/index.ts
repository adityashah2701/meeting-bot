import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getIdentityName, requireIdentity } from "../lib/auth";
import {
  listActiveParticipants,
  getMeetingDuration,
} from "../lib/meetinghelpers";

export const create = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    purpose: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const isScheduled =
      typeof args.scheduledFor === "number" && args.scheduledFor > now;

    const meetingId = await ctx.db.insert("meetings", {
      orgId: args.orgId,
      title: args.title,
      purpose: args.purpose ?? args.description ?? args.title,
      description: args.description,
      creatorTokenIdentifier: identity.tokenIdentifier,
      creatorClerkId: identity.subject,
      creatorName: getIdentityName(identity),
      status: isScheduled ? "scheduled" : "active",
      scheduledFor: args.scheduledFor,
      startedAt: isScheduled ? undefined : now,
      lastActivityAt: now,
    });

    const users = await ctx.db.query("users").take(200);
    const orgMembers = users.filter((user) => user.orgIds.includes(args.orgId));

    for (const user of orgMembers) {
      await ctx.db.insert("notifications", {
        userTokenIdentifier: user.tokenIdentifier,
        orgId: args.orgId,
        message: isScheduled
          ? `New meeting scheduled: ${args.title}`
          : `${getIdentityName(identity)} started ${args.title}`,
        link: `/meeting/${meetingId}`,
        isRead: false,
        createdAt: now,
      });
    }

    return meetingId;
  },
});

export const get = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      return null;
    }

    const participants = await listActiveParticipants(ctx, args.meetingId);
    const latestSummary = await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();

    return {
      ...meeting,
      durationMs: getMeetingDuration(meeting),
      activeParticipants: participants.length,
      summary: latestSummary?.content ?? null,
    };
  },
});

export const endMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    await ctx.db.patch(args.meetingId, {
      status: "ended",
      endedAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  },
});

export const getSummary = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();
  },
});

export const saveSummary = mutation({
  args: { meetingId: v.id("meetings"), summary: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const existing = await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.summary,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("meeting_assets", {
        meetingId: args.meetingId,
        type: "summary",
        content: args.summary,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getByOrg = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(50);

    return meetings;
  },
});

export const getDashboardFeed = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(8);

    const totalMeetings = meetings.length;
    const activeMeetings = meetings.filter(
      (meeting) => meeting.status === "active",
    ).length;
    const scheduledMeetings = meetings.filter(
      (meeting) => meeting.status === "scheduled",
    ).length;
    const completedMeetings = meetings.filter(
      (meeting) => meeting.status === "ended",
    ).length;

    return {
      stats: {
        totalMeetings,
        activeMeetings,
        scheduledMeetings,
        completedMeetings,
      },
      meetings,
    };
  },
});
