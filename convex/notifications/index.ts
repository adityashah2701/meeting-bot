import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "../lib/auth";

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    return await ctx.db
      .query("notifications")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .order("desc")
      .take(20);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});
