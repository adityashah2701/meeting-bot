import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertMeetingAccess, assertOrgAccess, requireIdentity } from "../lib/auth";

export const list = query({
  args: {
    orgId: v.string(),
    status: v.optional(
      v.union(v.literal("open"), v.literal("in_progress"), v.literal("done")),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const status = args.status ?? "open";
    return await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", status),
      )
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    orgId: v.string(),
    meetingId: v.optional(v.id("meetings")),
    title: v.string(),
    assigneeName: v.optional(v.string()),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    return await ctx.db.insert("tasks", {
      ...args,
      status: "open",
      source: "manual",
      createdAt: Date.now(),
    });
  },
});

export const createFromSummary = mutation({
  args: {
    orgId: v.string(),
    meetingId: v.id("meetings"),
    titles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    const normalizedTitles = args.titles
      .map((title) => title.trim())
      .filter(Boolean);

    if (normalizedTitles.length === 0) {
      return [];
    }

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .take(100);

    const existingTitleSet = new Set(
      existingTasks.map((task) => task.title.trim().toLowerCase()),
    );

    const now = Date.now();
    const createdTaskIds = [];

    for (const title of normalizedTitles) {
      const normalizedTitle = title.toLowerCase();
      if (existingTitleSet.has(normalizedTitle)) {
        continue;
      }

      const taskId = await ctx.db.insert("tasks", {
        orgId: args.orgId,
        meetingId: args.meetingId,
        title,
        status: "open",
        source: "summary",
        createdAt: now,
      });

      existingTitleSet.add(normalizedTitle);
      createdTaskIds.push(taskId);
    }

    return createdTaskIds;
  },
});
