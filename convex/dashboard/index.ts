import { query } from "../_generated/server";
import { v } from "convex/values";
import { hasOrgAccess, requireIdentity } from "../lib/auth";

export const getOverview = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const hasAccess = await hasOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    if (!hasAccess) {
      return {
        stats: {
          totalMeetings: 0,
          activeMeetings: 0,
          scheduledMeetings: 0,
          summariesGenerated: 0,
          openTasks: 0,
        },
        recentMeetings: [],
        activeMeeting: null,
      };
    }

    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(50);

    const activeMeeting =
      meetings.find((meeting) => meeting.status === "active") ?? null;
    const summaryAssets = await Promise.all(
      meetings.map((meeting) =>
        ctx.db
          .query("meeting_assets")
          .withIndex("by_meetingId_and_type", (q) =>
            q.eq("meetingId", meeting._id).eq("type", "summary"),
          )
          .unique(),
      ),
    );
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "open"),
      )
      .take(50);

    return {
      stats: {
        totalMeetings: meetings.length,
        activeMeetings: meetings.filter(
          (meeting) => meeting.status === "active",
        ).length,
        scheduledMeetings: meetings.filter(
          (meeting) => meeting.status === "scheduled",
        ).length,
        summariesGenerated: summaryAssets.filter(Boolean).length,
        openTasks: tasks.length,
      },
      recentMeetings: meetings.slice(0, 6),
      activeMeeting,
    };
  },
});
