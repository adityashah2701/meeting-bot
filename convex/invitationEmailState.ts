import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const markEmailDelivery = internalMutation({
  args: {
    inviteId: v.id("meeting_invites"),
    emailDeliveryStatus: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("skipped"),
      v.literal("failed"),
    ),
    lastEmailError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inviteId, {
      emailDeliveryStatus: args.emailDeliveryStatus,
      lastEmailAttemptAt: Date.now(),
      lastEmailError: args.lastEmailError,
    });
  },
});
