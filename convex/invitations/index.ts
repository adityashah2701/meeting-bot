import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  getCurrentUserRecord,
  requireIdentity,
} from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";
import {
  normalizeInviteEmail,
  resolveInviteStatus,
  type MeetingInviteStatus,
} from "../lib/invitations";
import { resolveScheduledEndsAt } from "../../lib/meeting-schedule";

function invitationStatusForUser(
  invite: Pick<Doc<"meeting_invites">, "status" | "expiresAt">,
): MeetingInviteStatus {
  return resolveInviteStatus(invite);
}

export const listMine = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getCurrentUserRecord(ctx, identity.tokenIdentifier);
    const normalizedEmail = normalizeInviteEmail(identity.email ?? user?.email ?? "");

    const directInvites = await ctx.db
      .query("meeting_invites")
      .withIndex("by_invitedUserTokenIdentifier_and_createdAt", (q) =>
        q.eq("invitedUserTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(100);

    const emailInvites = normalizedEmail
      ? await ctx.db
          .query("meeting_invites")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .order("desc")
          .take(100)
      : [];

    const invites = [...directInvites, ...emailInvites].reduce<Array<Doc<"meeting_invites">>>(
      (unique, invite) => {
        if (unique.some((existing) => existing._id === invite._id)) {
          return unique;
        }
        return [...unique, invite];
      }, []);

    const items = await Promise.all(
      invites.map(async (invite) => {
        const status = invitationStatusForUser(invite);
        if (status === "cancelled") {
          return null;
        }

        const meeting = await ctx.db.get(invite.meetingId);
        if (!meeting || (args.orgId && meeting.orgId !== args.orgId)) {
          return null;
        }
        const organization = await ctx.db
          .query("organizations")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", meeting.orgId))
          .unique();
        const participant = await getMeetingParticipant(
          ctx,
          invite.meetingId,
          identity.tokenIdentifier,
        );

        return {
          _id: invite._id,
          meetingId: invite.meetingId,
          meetingTitle: meeting.title,
          meetingPurpose: meeting.purpose,
          meetingStatus: meeting.status,
          scheduledFor: meeting.scheduledFor ?? null,
          organizerName: invite.invitedByName || meeting.creatorName,
          organizationName: organization?.name ?? "Workspace",
          invitationStatus: status,
          role: invite.role,
          createdAt: invite.createdAt,
          respondedAt: invite.respondedAt ?? null,
          expiresAt: invite.expiresAt ?? null,
          isLive: meeting.status === "active",
          isInactive: meeting.status === "ended" || status === "expired",
          canJoin: meeting.status === "active" && status !== "declined" && status !== "expired",
          joinLink: `/meeting/${invite.meetingId}`,
          calendarLinks: meeting.scheduledFor
            ? {
                google: `/api/invitations/${invite._id}/calendar?provider=google`,
                outlook: `/api/invitations/${invite._id}/calendar?provider=outlook`,
                ics: `/api/invitations/${invite._id}/calendar?provider=ics`,
              }
            : null,
          participantStatus: participant?.status ?? null,
        };
      }),
    );

    return items
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => right.createdAt - left.createdAt);
  },
});

export const getCalendarInvite = query({
  args: {
    invitationId: v.id("meeting_invites"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) {
      throw new Error("Invitation not found");
    }

    const status = resolveInviteStatus(invite);
    if (status === "cancelled" || status === "expired") {
      throw new Error("Invitation is no longer active");
    }

    let allowed = false;
    if (args.token && invite.token && args.token === invite.token) {
      allowed = true;
    }

    if (!allowed) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await getCurrentUserRecord(ctx, identity.tokenIdentifier);
        const allowedEmail = normalizeInviteEmail(identity.email ?? user?.email ?? "");
        const inviteEmail = normalizeInviteEmail(invite.email);

        if (
          invite.invitedUserTokenIdentifier === identity.tokenIdentifier ||
          (!invite.invitedUserTokenIdentifier && inviteEmail === allowedEmail)
        ) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      throw new Error("Invitation not found");
    }

    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (!meeting.scheduledFor) {
      throw new Error("This meeting is not scheduled");
    }

    return {
      invitationId: invite._id,
      meetingId: invite.meetingId,
      title: meeting.title,
      purpose: meeting.purpose,
      description: meeting.description ?? "",
      startsAt: meeting.scheduledFor,
      endsAt: resolveScheduledEndsAt(
        meeting.scheduledFor,
        meeting.scheduledEndsAt,
      ),
      status,
    };
  },
});

export const respond = mutation({
  args: {
    invitationId: v.id("meeting_invites"),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) {
      throw new Error("Invitation not found");
    }

    const user = await getCurrentUserRecord(ctx, identity.tokenIdentifier);
    const allowedEmail = normalizeInviteEmail(identity.email ?? user?.email ?? "");
    const inviteEmail = normalizeInviteEmail(invite.email);

    if (
      invite.invitedUserTokenIdentifier &&
      invite.invitedUserTokenIdentifier !== identity.tokenIdentifier
    ) {
      throw new Error("Invitation not found");
    }

    if (!invite.invitedUserTokenIdentifier && inviteEmail !== allowedEmail) {
      throw new Error("Invitation not found");
    }

    const status = resolveInviteStatus(invite);
    if (status === "cancelled" || status === "expired") {
      throw new Error("This invitation is no longer active");
    }

    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const now = Date.now();
    await ctx.db.patch(invite._id, {
      invitedUserTokenIdentifier: identity.tokenIdentifier,
      status: args.response,
      respondedAt: now,
      acceptedAt: args.response === "accepted" ? now : invite.acceptedAt,
      declinedAt: args.response === "declined" ? now : invite.declinedAt,
    });

    if (args.response === "accepted") {
      const existingParticipant = await getMeetingParticipant(
        ctx,
        invite.meetingId,
        identity.tokenIdentifier,
      );

      if (!existingParticipant) {
        await ctx.db.insert("meeting_participants", {
          meetingId: invite.meetingId,
          userTokenIdentifier: identity.tokenIdentifier,
          clerkId: identity.subject,
          name: identity.name ?? identity.email ?? "Participant",
          imageUrl: identity.pictureUrl,
          role: invite.role,
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
      } else if (existingParticipant.status !== "joined") {
        await ctx.db.patch(existingParticipant._id, {
          role: invite.role,
          status: "left",
          leftAt: now,
          removedAt: undefined,
          rejectedAt: undefined,
          removedByParticipantId: undefined,
          rejoinBlocked: false,
          lastSeenAt: now,
        });
      }
    }

    await ctx.db.insert("notifications", {
      userTokenIdentifier: invite.invitedByTokenIdentifier,
      orgId: invite.orgId,
      kind: `invitation_${args.response}`,
      title: args.response === "accepted" ? "Invitation accepted" : "Invitation declined",
      message: `${identity.name ?? identity.email ?? "A participant"} ${args.response} your invite to ${meeting.title}`,
      link: `/meeting/${invite.meetingId}`,
      invitationId: invite._id,
      meetingId: invite.meetingId,
      isRead: false,
      createdAt: now,
    });

    const invitationNotification = await ctx.db
      .query("notifications")
      .withIndex("by_userTokenIdentifier_and_invitationId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("invitationId", invite._id),
      )
      .unique();

    if (invitationNotification) {
      await ctx.db.patch(invitationNotification._id, {
        isRead: true,
      });
    }

    return { invitationId: invite._id, response: args.response };
  },
});
