import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { assertOrgAccess, requireIdentity } from "../lib/auth";

const defaultIntegrations = [
  {
    key: "zoom",
    name: "Zoom",
    category: "Conferencing",
    description: "Import cloud recordings and meeting links from Zoom.",
  },
  {
    key: "google-calendar",
    name: "Google Calendar",
    category: "Scheduling",
    description: "Sync scheduled meetings and reminders.",
  },
  {
    key: "slack",
    name: "Slack",
    category: "Communication",
    description: "Share summaries and action items in Slack.",
  },
  {
    key: "notion",
    name: "Notion",
    category: "Knowledge",
    description: "Export meeting summaries, action items, and transcripts into Notion.",
  },
] as const;

export const ensureIntegrations = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(10);

    if (existing.length > 0) {
      return existing;
    }

    const now = Date.now();
    for (const integration of defaultIntegrations) {
      await ctx.db.insert("integrations", {
        orgId: args.orgId,
        ...integration,
        connected: integration.key === "zoom",
        updatedAt: now,
      });
    }

    return await ctx.db
      .query("integrations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(10);
  },
});

export const listIntegrations = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    return await ctx.db
      .query("integrations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(10);
  },
});
