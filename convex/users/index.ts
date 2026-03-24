import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "../lib/auth";
import { resolveInviteStatus } from "../lib/invitations";

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // First check by clerkId (most reliable — set by webhook)
    const userByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const fullName =
      [args.firstName, args.lastName].filter(Boolean).join(" ") || undefined;

    if (userByClerkId) {
      await ctx.db.patch(userByClerkId._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        fullName,
        imageUrl: args.imageUrl,
      });
      return;
    }

    // Fallback: check by the legacy tokenIdentifier = clerkId pattern
    const userByTokenId = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.clerkId))
      .first();

    if (userByTokenId) {
      await ctx.db.patch(userByTokenId._id, {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        fullName,
        imageUrl: args.imageUrl,
      });
      return;
    }

    // New user — tokenIdentifier is initially the clerkId; syncUser will
    // correct it to the full Clerk tokenIdentifier on first sign-in.
    await ctx.db.insert("users", {
      tokenIdentifier: args.clerkId,
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName,
      imageUrl: args.imageUrl,
      orgIds: [],
    });
  },
});

export const deleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const upsertOrganization = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (org) {
      await ctx.db.patch(org._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
    } else {
      await ctx.db.insert("organizations", args);
    }
  },
});

export const deleteOrganization = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (org) {
      await ctx.db.delete(org._id);
    }
  },
});

export const addOrganizationMembership = internalMutation({
  args: {
    userClerkId: v.string(),
    orgClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userClerkId))
      .first();
    if (user && !user.orgIds.includes(args.orgClerkId)) {
      await ctx.db.patch(user._id, {
        orgIds: [...user.orgIds, args.orgClerkId],
      });
      
      const existingMembership = await ctx.db
        .query("user_org_memberships")
        .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
          q.eq("userTokenIdentifier", user.tokenIdentifier).eq("orgId", args.orgClerkId),
        )
        .unique();
        
      if (!existingMembership) {
        await ctx.db.insert("user_org_memberships", {
          userTokenIdentifier: user.tokenIdentifier,
          orgId: args.orgClerkId,
        });
      }
    }
  },
});

export const removeOrganizationMembership = internalMutation({
  args: {
    userClerkId: v.string(),
    orgClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userClerkId))
      .first();
    if (user) {
      await ctx.db.patch(user._id, {
        orgIds: user.orgIds.filter((id) => id !== args.orgClerkId),
      });

      const existingMembership = await ctx.db
        .query("user_org_memberships")
        .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
          q.eq("userTokenIdentifier", user.tokenIdentifier).eq("orgId", args.orgClerkId),
        )
        .unique();

      if (existingMembership) {
        await ctx.db.delete(existingMembership._id);
      }
    }
  },
});

export const syncUser = mutation({
  args: {
    orgIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { subject, name, email, pictureUrl, tokenIdentifier } = identity;

    const updates = {
      tokenIdentifier,
      clerkId: subject,
      email: email || "",
      fullName: name || "",
      firstName: name?.split(" ")[0] || "",
      lastName: name?.split(" ").slice(1).join(" ") || "",
      imageUrl: pictureUrl || "",
      orgIds: args.orgIds,
    };

    // Primary lookup: by tokenIdentifier (correct path after first sync)
    let user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();

    if (!user) {
      // Fallback: webhook created the user with tokenIdentifier = clerkId
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", subject))
        .first();
    }

    if (user) {
      const isUpgradingToken = user.tokenIdentifier !== tokenIdentifier;

      // Update and correct the tokenIdentifier to the full Clerk value
      await ctx.db.patch(user._id, updates);

      if (isUpgradingToken) {
        // Upgrade all user_org_memberships rows that use the old clerkId
        const oldMemberships = await ctx.db
          .query("user_org_memberships")
          .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
            q.eq("userTokenIdentifier", user!.tokenIdentifier), // user.tokenIdentifier was the old one
          )
          .collect();

        for (const membership of oldMemberships) {
          await ctx.db.patch(membership._id, {
            userTokenIdentifier: tokenIdentifier,
          });
        }

        // Upgrade all notifications
        const oldNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
            q.eq("userTokenIdentifier", user!.tokenIdentifier),
          )
          .collect();

        for (const notification of oldNotifications) {
          await ctx.db.patch(notification._id, {
            userTokenIdentifier: tokenIdentifier,
          });
        }
      }
    } else {
      await ctx.db.insert("users", updates);
    }

    // Sync user_org_memberships join table
    for (const orgId of args.orgIds) {
      const existing = await ctx.db
        .query("user_org_memberships")
        .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
          q.eq("userTokenIdentifier", tokenIdentifier).eq("orgId", orgId),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("user_org_memberships", {
          userTokenIdentifier: tokenIdentifier,
          orgId,
        });
      }

      if (!updates.email) {
        continue;
      }

      const pendingInvites = await ctx.db
        .query("meeting_invites")
        .withIndex("by_orgId_and_email", (q) =>
          q.eq("orgId", orgId).eq("email", updates.email),
        )
        .take(100);

      for (const invite of pendingInvites) {
        const status = resolveInviteStatus(invite);
        if (status === "cancelled" || status === "expired") {
          continue;
        }

        await ctx.db.patch(invite._id, {
          invitedUserTokenIdentifier: tokenIdentifier,
        });

        const existingNotification = await ctx.db
          .query("notifications")
          .withIndex("by_userTokenIdentifier_and_invitationId", (q) =>
            q.eq("userTokenIdentifier", tokenIdentifier).eq("invitationId", invite._id),
          )
          .unique();

        if (!existingNotification) {
          const meeting = await ctx.db.get(invite.meetingId);
          if (!meeting) {
            continue;
          }

          await ctx.db.insert("notifications", {
            userTokenIdentifier: tokenIdentifier,
            orgId,
            kind: "meeting_invitation",
            title: "Meeting invitation",
            message: `You’ve been invited to ${meeting.title} by ${invite.invitedByName}`,
            link: "/dashboard#invitation-inbox",
            invitationId: invite._id,
            meetingId: invite.meetingId,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});
