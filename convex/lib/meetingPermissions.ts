import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const meetingRoleValues = [
  "host",
  "co_host",
  "participant",
  "viewer",
] as const;

export const meetingPermissionValues = [
  "canJoinMeeting",
  "canAdmitOthers",
  "canRemoveParticipants",
  "canMuteOthers",
  "canShareScreen",
  "canUseWhiteboard",
  "canSendChat",
  "canStartRecording",
  "canChangeSettings",
  "canManageRoles",
  "canLockMeeting",
  "canUnmuteSelf",
] as const;

export const meetingJoinModeValues = [
  "organization_only",
  "invite_only",
  "anyone_with_link",
  "ask_to_join",
] as const;

export const meetingParticipantStatusValues = [
  "waiting",
  "joined",
  "left",
  "removed",
  "rejected",
] as const;

export type MeetingRole = (typeof meetingRoleValues)[number];
export type MeetingPermission = (typeof meetingPermissionValues)[number];
export type MeetingJoinMode = (typeof meetingJoinModeValues)[number];
export type MeetingParticipantStatus = (typeof meetingParticipantStatusValues)[number];
export type MeetingSettings = {
  joinMode: MeetingJoinMode;
  allowScreenShare: boolean;
  allowWhiteboard?: boolean;
  allowChat: boolean;
  allowReactions: boolean;
  allowRecording: boolean;
  allowParticipantsToUnmute: boolean;
  autoAdmitOrgUsers: boolean;
  lobbyEnabled: boolean;
};

export const meetingRoleValidator = v.union(
  v.literal("host"),
  v.literal("co_host"),
  v.literal("participant"),
  v.literal("viewer"),
);

export const meetingJoinModeValidator = v.union(
  v.literal("organization_only"),
  v.literal("invite_only"),
  v.literal("anyone_with_link"),
  v.literal("ask_to_join"),
);

export const meetingParticipantStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("joined"),
  v.literal("left"),
  v.literal("removed"),
  v.literal("rejected"),
);

export const permissionsOverrideValidator = v.optional(
  v.object({
    canJoinMeeting: v.optional(v.boolean()),
    canAdmitOthers: v.optional(v.boolean()),
    canRemoveParticipants: v.optional(v.boolean()),
    canMuteOthers: v.optional(v.boolean()),
    canShareScreen: v.optional(v.boolean()),
    canUseWhiteboard: v.optional(v.boolean()),
    canSendChat: v.optional(v.boolean()),
    canStartRecording: v.optional(v.boolean()),
    canChangeSettings: v.optional(v.boolean()),
    canManageRoles: v.optional(v.boolean()),
    canLockMeeting: v.optional(v.boolean()),
    canUnmuteSelf: v.optional(v.boolean()),
  }),
);

export const meetingSettingsValidator = v.object({
  joinMode: meetingJoinModeValidator,
  allowScreenShare: v.boolean(),
  allowWhiteboard: v.optional(v.boolean()),
  allowChat: v.boolean(),
  allowReactions: v.boolean(),
  allowRecording: v.boolean(),
  allowParticipantsToUnmute: v.boolean(),
  autoAdmitOrgUsers: v.boolean(),
  lobbyEnabled: v.boolean(),
});

export type MeetingPermissionMap = Record<MeetingPermission, boolean>;

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
  joinMode: "organization_only",
  allowScreenShare: true,
  allowWhiteboard: true,
  allowChat: true,
  allowReactions: true,
  allowRecording: true,
  allowParticipantsToUnmute: true,
  autoAdmitOrgUsers: true,
  lobbyEnabled: false,
} as const;

export function getDefaultMeetingSettings(
  overrides: Partial<MeetingSettings> = {},
) {
  return {
    ...DEFAULT_MEETING_SETTINGS,
    ...overrides,
  };
}

function createPermissionMap(defaultValue = false): MeetingPermissionMap {
  return Object.fromEntries(
    meetingPermissionValues.map((permission) => [permission, defaultValue]),
  ) as MeetingPermissionMap;
}

export const ROLE_PERMISSION_MAP: Record<MeetingRole, MeetingPermissionMap> = {
  host: {
    canJoinMeeting: true,
    canAdmitOthers: true,
    canRemoveParticipants: true,
    canMuteOthers: true,
    canShareScreen: true,
    canUseWhiteboard: true,
    canSendChat: true,
    canStartRecording: true,
    canChangeSettings: true,
    canManageRoles: true,
    canLockMeeting: true,
    canUnmuteSelf: true,
  },
  co_host: {
    canJoinMeeting: true,
    canAdmitOthers: true,
    canRemoveParticipants: true,
    canMuteOthers: true,
    canShareScreen: true,
    canUseWhiteboard: true,
    canSendChat: true,
    canStartRecording: true,
    canChangeSettings: true,
    canManageRoles: true,
    canLockMeeting: true,
    canUnmuteSelf: true,
  },
  participant: {
    canJoinMeeting: true,
    canAdmitOthers: false,
    canRemoveParticipants: false,
    canMuteOthers: false,
    canShareScreen: true,
    canUseWhiteboard: true,
    canSendChat: true,
    canStartRecording: false,
    canChangeSettings: false,
    canManageRoles: false,
    canLockMeeting: false,
    canUnmuteSelf: true,
  },
  viewer: {
    canJoinMeeting: true,
    canAdmitOthers: false,
    canRemoveParticipants: false,
    canMuteOthers: false,
    canShareScreen: false,
    canUseWhiteboard: false,
    canSendChat: false,
    canStartRecording: false,
    canChangeSettings: false,
    canManageRoles: false,
    canLockMeeting: false,
    canUnmuteSelf: false,
  },
};

export function createEmptyMeetingPermissionMap() {
  return createPermissionMap(false);
}

export function isPrivilegedMeetingRole(role: MeetingRole) {
  return role === "host" || role === "co_host";
}

export function resolveParticipantPermissions(
  meeting: Pick<Doc<"meetings">, "settings" | "isLocked">,
  participant: Pick<Doc<"meeting_participants">, "role" | "permissionsOverride" | "status"> | null,
) {
  if (!participant || participant.status !== "joined") {
    return createPermissionMap(false);
  }

  const resolvedSettings = getDefaultMeetingSettings(meeting.settings);
  const resolved = {
    ...ROLE_PERMISSION_MAP[participant.role],
  };

  if (!resolvedSettings.allowScreenShare && !isPrivilegedMeetingRole(participant.role)) {
    resolved.canShareScreen = false;
  }

  if (!resolvedSettings.allowWhiteboard && !isPrivilegedMeetingRole(participant.role)) {
    resolved.canUseWhiteboard = false;
  }

  if (!resolvedSettings.allowChat && !isPrivilegedMeetingRole(participant.role)) {
    resolved.canSendChat = false;
  }

  if (!resolvedSettings.allowRecording && !isPrivilegedMeetingRole(participant.role)) {
    resolved.canStartRecording = false;
  }

  if (!resolvedSettings.allowParticipantsToUnmute && !isPrivilegedMeetingRole(participant.role)) {
    resolved.canUnmuteSelf = false;
  }

  if (participant.permissionsOverride) {
    for (const permission of meetingPermissionValues) {
      const override = participant.permissionsOverride[permission];
      if (typeof override === "boolean") {
        resolved[permission] = override;
      }
    }
  }

  return resolved;
}

export function hasMeetingPermission(
  meeting: Pick<Doc<"meetings">, "settings" | "isLocked">,
  participant: Pick<Doc<"meeting_participants">, "role" | "permissionsOverride" | "status"> | null,
  permission: MeetingPermission,
) {
  return resolveParticipantPermissions(meeting, participant)[permission];
}

export function canManageParticipantRole(
  actor: Pick<Doc<"meeting_participants">, "_id" | "role" | "status">,
  target: Pick<Doc<"meeting_participants">, "_id" | "role">,
) {
  if (actor.status !== "joined" || actor._id === target._id) {
    return false;
  }

  if (actor.role === "host") {
    return target.role !== "host";
  }

  if (actor.role === "co_host") {
    return target.role === "participant" || target.role === "viewer";
  }

  return false;
}

export function getMeetingPageAccess({
  meeting,
  isOrgMember,
  isInvited,
  participant,
}: {
  meeting: Pick<Doc<"meetings">, "settings">;
  isOrgMember: boolean;
  isInvited: boolean;
  participant: Pick<Doc<"meeting_participants">, "role" | "status"> | null;
}) {
  if (participant) {
    return true;
  }

  if (isOrgMember) {
    return true;
  }

  if (isInvited) {
    return true;
  }

  return (
    meeting.settings.joinMode === "anyone_with_link" ||
    meeting.settings.joinMode === "ask_to_join"
  );
}

export function resolveJoinDecision({
  meeting,
  participant,
  isOrgMember,
  isInvited,
}: {
  meeting: Pick<Doc<"meetings">, "status" | "isLocked" | "settings">;
  participant: Pick<Doc<"meeting_participants">, "role" | "status" | "rejoinBlocked"> | null;
  isOrgMember: boolean;
  isInvited: boolean;
}) {
  if (meeting.status === "ended") {
    return {
      status: "denied" as const,
      reason: "This meeting has already ended.",
    };
  }

  if (participant?.status === "removed" && participant.rejoinBlocked) {
    return {
      status: "denied" as const,
      reason: "You were removed from this meeting.",
    };
  }

  if (participant && isPrivilegedMeetingRole(participant.role)) {
    return {
      status: "joined" as const,
      reason: null,
    };
  }

  if (meeting.isLocked && participant?.status !== "joined") {
    return {
      status: "denied" as const,
      reason: "This meeting is locked.",
    };
  }

  const shouldWaitForLobby =
    meeting.settings.lobbyEnabled &&
    !isInvited &&
    !(isOrgMember && meeting.settings.autoAdmitOrgUsers);

  if (meeting.settings.joinMode === "organization_only") {
    if (!isOrgMember) {
      return {
        status: "denied" as const,
        reason: "Only organization members can join this meeting.",
      };
    }

    return {
      status: shouldWaitForLobby ? ("waiting" as const) : ("joined" as const),
      reason: null,
    };
  }

  if (meeting.settings.joinMode === "invite_only") {
    const hasExplicitAccess =
      isInvited ||
      Boolean(
        participant &&
          participant.status !== "removed" &&
          participant.status !== "rejected",
      );

    if (!hasExplicitAccess) {
      return {
        status: "denied" as const,
        reason: "You need an invite to join this meeting.",
      };
    }

    return {
      status: "joined" as const,
      reason: null,
    };
  }

  if (meeting.settings.joinMode === "ask_to_join") {
    if (isInvited || (isOrgMember && meeting.settings.autoAdmitOrgUsers)) {
      return {
        status: "joined" as const,
        reason: null,
      };
    }

    return {
      status: "waiting" as const,
      reason: null,
    };
  }

  return {
    status: shouldWaitForLobby ? ("waiting" as const) : ("joined" as const),
    reason: null,
  };
}

export function pickNextHost(
  participants: Array<
    Pick<Doc<"meeting_participants">, "_id" | "role" | "status" | "joinedAt" | "requestedAt">
  >,
) {
  const activeFirst = [...participants].sort((left, right) => {
    const statusScore = (status: Doc<"meeting_participants">["status"]) =>
      status === "joined" ? 0 : 1;
    const roleScore = (role: MeetingRole) => {
      if (role === "co_host") return 0;
      if (role === "participant") return 1;
      if (role === "viewer") return 2;
      return 3;
    };

    return (
      statusScore(left.status) - statusScore(right.status) ||
      roleScore(left.role) - roleScore(right.role) ||
      (left.joinedAt ?? left.requestedAt ?? 0) - (right.joinedAt ?? right.requestedAt ?? 0)
    );
  });

  return activeFirst.find((participant) => participant.role !== "host") ?? null;
}
