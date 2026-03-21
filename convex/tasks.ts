import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./lib/auth";

export const list = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.union(v.literal("open"), v.literal("in_progress"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "open";
    return await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) => q.eq("orgId", args.orgId).eq("status", status))
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
    await requireIdentity(ctx);
    return await ctx.db.insert("tasks", {
      ...args,
      status: "open",
      source: "manual",
      createdAt: Date.now(),
    });
  },
});
