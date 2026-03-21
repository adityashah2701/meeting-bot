import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    purpose: v.string(),
    description: v.optional(v.string()),
    isScheduled: v.boolean(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const meetingId = await ctx.db.insert("meetings", {
      orgId: args.orgId,
      title: args.title,
      purpose: args.purpose,
      description: args.description,
      creatorId: identity.subject,
      status: args.isScheduled ? "scheduled" : "active",
      scheduledFor: args.scheduledFor,
      startedAt: args.isScheduled ? undefined : Date.now(),
    });

    // Notify all organization members
    const allUsers = await ctx.db.query("users").collect();
    const orgMembers = allUsers.filter((user) => user.orgIds.includes(args.orgId));

    for (const user of orgMembers) {
      await ctx.db.insert("notifications", {
        userId: user.clerkId,
        orgId: args.orgId,
        message: args.isScheduled 
          ? `New meeting scheduled: ${args.title}` 
          : `${identity.name || "A user"} started an instant meeting: ${args.title}`,
        link: `/meeting/${meetingId}`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return meetingId;
  },
});

export const get = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.meetingId);
  },
});

export const endMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, { status: "ended" });
  },
});


export const getSummary = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .filter((q) => q.eq(q.field("type"), "summary"))
      .first();
  },
});

export const saveSummary = mutation({
  args: { meetingId: v.id("meetings"), summary: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .filter((q) => q.eq(q.field("type"), "summary"))
      .first();
      
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.summary });
    } else {
      await ctx.db.insert("meeting_assets", {
        meetingId: args.meetingId,
        type: "summary",
        content: args.summary,
      });
    }
  },
});

export const getByOrg = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});
