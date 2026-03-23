import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  assertMeetingAccess,
  assertMeetingHost,
  assertOrgAccess,
  getIdentityName,
  hasMeetingInvite,
  hasOrgAccess,
  requireIdentity,
} from "../lib/auth";
import {
  getMeetingParticipant,
  listActiveParticipants,
  listMeetingParticipantsByStatus,
  getMeetingDuration,
} from "../lib/meetinghelpers";
import {
  createEmptyMeetingPermissionMap,
  getDefaultMeetingSettings,
  hasMeetingPermission,
  meetingRoleValidator,
  meetingSettingsValidator,
  resolveJoinDecision,
  resolveParticipantPermissions,
} from "../lib/meetingPermissions";

async function insertAuditLog(
  ctx: MutationCtx,
  args: {
    meetingId: Id<"meetings">;
    actorParticipantId?: Id<"meeting_participants">;
    actorName: string;
    action: string;
    targetParticipantId?: Id<"meeting_participants">;
    targetName?: string;
    metadata?: string;
  },
) {
  await ctx.db.insert("meeting_audit_logs", {
    meetingId: args.meetingId,
    actorParticipantId: args.actorParticipantId,
    actorName: args.actorName,
    action: args.action,
    targetParticipantId: args.targetParticipantId,
    targetName: args.targetName,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

export const create = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    purpose: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    settings: v.optional(meetingSettingsValidator),
    inviteEmails: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const now = Date.now();
    const isScheduled =
      typeof args.scheduledFor === "number" && args.scheduledFor > now;
    const settings = getDefaultMeetingSettings(args.settings);

    const meetingId = await ctx.db.insert("meetings", {
      orgId: args.orgId,
      title: args.title,
      purpose: args.purpose ?? args.description ?? args.title,
      description: args.description,
      creatorTokenIdentifier: identity.tokenIdentifier,
      creatorClerkId: identity.subject,
      creatorName: getIdentityName(identity),
      hostUserTokenIdentifier: identity.tokenIdentifier,
      hostClerkId: identity.subject,
      status: isScheduled ? "scheduled" : "active",
      isLocked: false,
      settings,
      scheduledFor: args.scheduledFor,
      startedAt: isScheduled ? undefined : now,
      lastActivityAt: now,
    });

    await ctx.db.insert("meeting_participants", {
      meetingId,
      userTokenIdentifier: identity.tokenIdentifier,
      clerkId: identity.subject,
      name: getIdentityName(identity),
      imageUrl: identity.pictureUrl,
      role: "host",
      permissionsOverride: undefined,
      status: "left",
      createdAt: now,
      requestedAt: now,
      joinedAt: now,
      admittedAt: undefined,
      leftAt: now,
      removedAt: undefined,
      rejectedAt: undefined,
      removedByParticipantId: undefined,
      rejoinBlocked: false,
      lastSeenAt: now,
      isMutedByModerator: false,
      isMicEnabled: false,
      isCameraEnabled: false,
      isScreenSharing: false,
    });

    const inviteEmails = [...new Set((args.inviteEmails ?? [])
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean))];

    for (const email of inviteEmails) {
      await ctx.db.insert("meeting_invites", {
        meetingId,
        email,
        role: "participant",
        invitedByTokenIdentifier: identity.tokenIdentifier,
        createdAt: now,
      });
    }

    const memberships = await ctx.db
      .query("user_org_memberships")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.insert("notifications", {
        userTokenIdentifier: membership.userTokenIdentifier,
        orgId: args.orgId,
        message: isScheduled
          ? `New meeting scheduled: ${args.title}`
          : `${getIdentityName(identity)} started ${args.title}`,
        link: `/meeting/${meetingId}`,
        isRead: false,
        createdAt: now,
      });
    }

    return meetingId;
  },
});

export const get = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    const isOrgMember = await hasOrgAccess(
      ctx,
      identity.tokenIdentifier,
      meeting.orgId,
    );
    const isInvited = await hasMeetingInvite(
      ctx,
      args.meetingId,
      identity.email ?? null,
    );
    const participants = await listActiveParticipants(ctx, args.meetingId);
    const waitingRoom = hasMeetingPermission(meeting, participant, "canAdmitOthers")
      ? await listMeetingParticipantsByStatus(ctx, args.meetingId, "waiting")
      : [];
    const latestSummary = await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();
    const effectivePermissions = participant
      ? resolveParticipantPermissions(meeting, participant)
      : createEmptyMeetingPermissionMap();
    const joinDecision = resolveJoinDecision({
      meeting,
      participant,
      isOrgMember,
      isInvited,
    });

    return {
      ...meeting,
      durationMs: getMeetingDuration(meeting),
      activeParticipants: participants.length,
      waitingParticipants: waitingRoom.length,
      summary: latestSummary?.content ?? null,
      key_points: latestSummary?.key_points ?? [],
      decisions: latestSummary?.decisions ?? [],
      action_items: latestSummary?.action_items ?? [],
      currentParticipant: participant,
      effectivePermissions,
      joinDecision,
      isOrgMember,
      isInvited,
    };
  },
});

export const updateSettings = mutation({
  args: {
    meetingId: v.id("meetings"),
    settings: meetingSettingsValidator,
    isLocked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!hasMeetingPermission(meeting, participant, "canChangeSettings")) {
      throw new Error("You do not have permission to change meeting settings");
    }

    await ctx.db.patch(args.meetingId, {
      settings: getDefaultMeetingSettings(args.settings),
      isLocked: args.isLocked ?? meeting.isLocked,
      lastActivityAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      meetingId: args.meetingId,
      actorParticipantId: participant?._id,
      actorName: participant?.name ?? getIdentityName(identity),
      action: "meeting_settings_updated",
      metadata: JSON.stringify({
        joinMode: args.settings.joinMode,
        isLocked: args.isLocked ?? meeting.isLocked,
      }),
    });
  },
});

export const updateLock = mutation({
  args: {
    meetingId: v.id("meetings"),
    isLocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!hasMeetingPermission(meeting, participant, "canLockMeeting")) {
      throw new Error("You do not have permission to lock this meeting");
    }

    await ctx.db.patch(args.meetingId, {
      isLocked: args.isLocked,
      lastActivityAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      meetingId: args.meetingId,
      actorParticipantId: participant?._id,
      actorName: participant?.name ?? getIdentityName(identity),
      action: args.isLocked ? "meeting_locked" : "meeting_unlocked",
    });
  },
});

export const inviteParticipants = mutation({
  args: {
    meetingId: v.id("meetings"),
    emails: v.array(v.string()),
    role: v.optional(meetingRoleValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meeting = await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );

    if (!hasMeetingPermission(meeting, participant, "canChangeSettings")) {
      throw new Error("You do not have permission to invite people");
    }

    const role = args.role ?? "participant";
    const inserted: string[] = [];
    for (const email of [...new Set(args.emails.map((entry) => entry.trim().toLowerCase()).filter(Boolean))]) {
      const existing = await ctx.db
        .query("meeting_invites")
        .withIndex("by_meetingId_and_email", (q) =>
          q.eq("meetingId", args.meetingId).eq("email", email),
        )
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert("meeting_invites", {
        meetingId: args.meetingId,
        email,
        role,
        invitedByTokenIdentifier: identity.tokenIdentifier,
        createdAt: Date.now(),
      });
      inserted.push(email);
    }

    await insertAuditLog(ctx, {
      meetingId: args.meetingId,
      actorParticipantId: participant?._id,
      actorName: participant?.name ?? getIdentityName(identity),
      action: "participants_invited",
      metadata: JSON.stringify({ count: inserted.length, role }),
    });

    return inserted;
  },
});

export const endMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const participant = await getMeetingParticipant(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
    );
    assertMeetingHost(participant);
    await ctx.db.patch(args.meetingId, {
      status: "ended",
      endedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    await insertAuditLog(ctx, {
      meetingId: args.meetingId,
      actorParticipantId: participant?._id,
      actorName: participant?.name ?? getIdentityName(identity),
      action: "meeting_ended",
    });
  },
});

export const getSummary = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();
  },
});

export const saveSummary = mutation({
  args: {
    meetingId: v.id("meetings"),
    summary: v.string(),
    key_points: v.optional(v.array(v.string())),
    decisions: v.optional(v.array(v.string())),
    action_items: v.optional(
      v.array(
        v.object({
          task: v.string(),
          assignee: v.union(v.string(), v.null()),
          due: v.union(v.string(), v.null()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const existing = await ctx.db
      .query("meeting_assets")
      .withIndex("by_meetingId_and_type", (q) =>
        q.eq("meetingId", args.meetingId).eq("type", "summary"),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.summary,
        key_points: args.key_points,
        decisions: args.decisions,
        action_items: args.action_items,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("meeting_assets", {
        meetingId: args.meetingId,
        type: "summary",
        content: args.summary,
        key_points: args.key_points,
        decisions: args.decisions,
        action_items: args.action_items,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getByOrg = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(50);

    return meetings;
  },
});

export const getDashboardFeed = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(8);

    const totalMeetings = meetings.length;
    const activeMeetings = meetings.filter(
      (meeting) => meeting.status === "active",
    ).length;
    const scheduledMeetings = meetings.filter(
      (meeting) => meeting.status === "scheduled",
    ).length;
    const completedMeetings = meetings.filter(
      (meeting) => meeting.status === "ended",
    ).length;

    return {
      stats: {
        totalMeetings,
        activeMeetings,
        scheduledMeetings,
        completedMeetings,
      },
      meetings,
    };
  },
});
