import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertOrgAccess, requireIdentity } from "../lib/auth";

export const get = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(50);

    const activeCount = meetings.filter(
      (meeting) => meeting.status === "active",
    ).length;
    const endedCount = meetings.filter(
      (meeting) => meeting.status === "ended",
    ).length;

    return {
      totals: {
        meetings: meetings.length,
        active: activeCount,
        ended: endedCount,
      },
      timeline: meetings.map((meeting) => ({
        id: meeting._id,
        title: meeting.title,
        status: meeting.status,
        createdAt: meeting._creationTime,
      })),
    };
  },
});
