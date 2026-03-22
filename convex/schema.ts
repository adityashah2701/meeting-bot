import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    orgIds: v.array(v.string()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_clerkId", ["clerkId"]),

  organizations: defineTable({
    clerkId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_slug", ["slug"]),

  meetings: defineTable({
    orgId: v.string(),
    title: v.string(),
    purpose: v.string(),
    description: v.optional(v.string()),
    creatorTokenIdentifier: v.string(),
    creatorClerkId: v.string(),
    creatorName: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("active"), v.literal("ended")),
    scheduledFor: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    lastActivityAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_status", ["status"]),

  meeting_participants: defineTable({
    meetingId: v.id("meetings"),
    userTokenIdentifier: v.string(),
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(v.literal("joined"), v.literal("left")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    lastSeenAt: v.number(),
    isMicEnabled: v.boolean(),
    isCameraEnabled: v.boolean(),
    isScreenSharing: v.boolean(),
  })
    .index("by_meetingId_and_status", ["meetingId", "status"])
    .index("by_meetingId_and_userTokenIdentifier", ["meetingId", "userTokenIdentifier"]),

  messages: defineTable({
    meetingId: v.id("meetings"),
    senderParticipantId: v.id("meeting_participants"),
    senderName: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_meetingId_and_createdAt", ["meetingId", "createdAt"]),

  transcripts: defineTable({
    meetingId: v.id("meetings"),
    speakerParticipantId: v.optional(v.id("meeting_participants")),
    speakerId: v.string(),
    speakerName: v.string(),
    text: v.string(),
    timestamp: v.number(),
    createdAt: v.number(),
  }).index("by_meetingId_and_timestamp", ["meetingId", "timestamp"]),

  meeting_assets: defineTable({
    meetingId: v.id("meetings"),
    type: v.union(v.literal("summary"), v.literal("recording")),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  }).index("by_meetingId_and_type", ["meetingId", "type"]),

  notifications: defineTable({
    userTokenIdentifier: v.string(),
    orgId: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userTokenIdentifier_and_orgId", ["userTokenIdentifier", "orgId"])
    .index("by_userTokenIdentifier_and_isRead", ["userTokenIdentifier", "isRead"]),

  signals: defineTable({
    meetingId: v.id("meetings"),
    senderParticipantId: v.id("meeting_participants"),
    receiverParticipantId: v.id("meeting_participants"),
    kind: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate"),
      v.literal("renegotiate"),
    ),
    payload: v.string(),
    createdAt: v.number(),
  })
    .index("by_receiverParticipantId_and_createdAt", ["receiverParticipantId", "createdAt"])
    .index("by_meetingId_and_createdAt", ["meetingId", "createdAt"]),

  tasks: defineTable({
    orgId: v.string(),
    meetingId: v.optional(v.id("meetings")),
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("done")),
    assigneeName: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("summary")),
    createdAt: v.number(),
  })
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_meetingId", ["meetingId"]),

  integrations: defineTable({
    orgId: v.string(),
    key: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.string(),
    connected: v.boolean(),
    updatedAt: v.number(),
  }).index("by_orgId", ["orgId"]),
});
