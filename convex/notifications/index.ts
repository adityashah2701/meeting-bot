import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { hasOrgAccess, requireIdentity } from "../lib/auth";

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const hasAccess = await hasOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    if (!hasAccess) {
      return [];
    }

    const legacyTokenIdentifier = identity.tokenIdentifier.includes("|")
      ? identity.tokenIdentifier.split("|")[1]
      : identity.tokenIdentifier;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .order("desc")
      .take(20);

    if (
      notifications.length > 0 ||
      legacyTokenIdentifier === identity.tokenIdentifier
    ) {
      return notifications;
    }

    const legacyNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", legacyTokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .order("desc")
      .take(20);

    return [...notifications, ...legacyNotifications]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 20);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const notification = await ctx.db.get(args.notificationId);
    const legacyTokenIdentifier = identity.tokenIdentifier.includes("|")
      ? identity.tokenIdentifier.split("|")[1]
      : identity.tokenIdentifier;

    if (
      !notification ||
      (notification.userTokenIdentifier !== identity.tokenIdentifier &&
        notification.userTokenIdentifier !== legacyTokenIdentifier)
    ) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});
