import { query } from "./_generated/server";
import { v } from "convex/values";

export const getOverview = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(50);

    const activeMeeting = meetings.find((meeting) => meeting.status === "active") ?? null;
    const summaries = await ctx.db
      .query("meeting_assets")
      .take(50);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
      .take(50);

    return {
      stats: {
        totalMeetings: meetings.length,
        activeMeetings: meetings.filter((meeting) => meeting.status === "active").length,
        scheduledMeetings: meetings.filter((meeting) => meeting.status === "scheduled").length,
        summariesGenerated: summaries.filter((asset) => asset.type === "summary").length,
        openTasks: tasks.length,
      },
      recentMeetings: meetings.slice(0, 6),
      activeMeeting,
    };
  },
});
