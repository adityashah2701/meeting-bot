import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId)).first();
    
    if (user) {
      // Keep existing orgIds
      await ctx.db.patch(user._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
      });
    } else {
      await ctx.db.insert("users", {
        ...args,
        orgIds: [],
      });
    }
  },
});

export const deleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId)).first();
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
    const org = await ctx.db.query("organizations").withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId)).first();
    
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
    const org = await ctx.db.query("organizations").withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId)).first();
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
    const user = await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", args.userClerkId)).first();
    if (user && !user.orgIds.includes(args.orgClerkId)) {
      await ctx.db.patch(user._id, {
        orgIds: [...user.orgIds, args.orgClerkId],
      });
    }
  },
});

export const removeOrganizationMembership = internalMutation({
  args: {
    userClerkId: v.string(),
    orgClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", args.userClerkId)).first();
    if (user) {
      await ctx.db.patch(user._id, {
        orgIds: user.orgIds.filter((id) => id !== args.orgClerkId),
      });
    }
  },
});

export const syncUser = mutation({
  args: {
    orgIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return;
    }

    const { subject, name, email, pictureUrl } = identity;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", subject))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        firstName: name?.split(" ")[0] || "",
        lastName: name?.split(" ").slice(1).join(" ") || "",
        email: email || user.email,
        imageUrl: pictureUrl || "",
        orgIds: args.orgIds,
      });
    } else {
      await ctx.db.insert("users", {
        clerkId: subject,
        email: email || "",
        firstName: name?.split(" ")[0] || "",
        lastName: name?.split(" ").slice(1).join(" ") || "",
        imageUrl: pictureUrl || "",
        orgIds: args.orgIds,
      });
    }
  },
});
