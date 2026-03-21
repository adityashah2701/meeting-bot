import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    orgIds: v.array(v.string()), // List of Clerk Org IDs they belong to
  }).index("by_clerkId", ["clerkId"]),

  organizations: defineTable({
    clerkId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),

  meetings: defineTable({
    orgId: v.string(), // Clerk's Org ID
    title: v.string(),
    purpose: v.string(),
    description: v.optional(v.string()),
    creatorId: v.string(), // Clerk User ID
    status: v.union(v.literal("scheduled"), v.literal("active"), v.literal("ended")),
    scheduledFor: v.optional(v.number()), // Timestamp
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_orgId", ["orgId"])
    .index("by_status", ["status"]),

  transcripts: defineTable({
    meetingId: v.id("meetings"),
    speakerId: v.string(),
    speakerName: v.string(),
    text: v.string(),
    timestamp: v.number(),
  }).index("by_meetingId", ["meetingId"]),

  meeting_assets: defineTable({
    meetingId: v.id("meetings"),
    type: v.union(v.literal("summary"), v.literal("recording")),
    content: v.optional(v.string()), // Markdown
    storageId: v.optional(v.id("_storage")), // Convex generic storage ID
  }).index("by_meetingId", ["meetingId"]),

  notifications: defineTable({
    userId: v.string(), // Target user
    orgId: v.string(),  // Context org
    message: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"]),
});
