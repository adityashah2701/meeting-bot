export type MeetingStatus = "scheduled" | "active" | "ended";
export type MeetingRole = "host" | "co_host" | "participant" | "viewer";
export type MeetingJoinMode =
  | "organization_only"
  | "invite_only"
  | "anyone_with_link"
  | "ask_to_join";
export type MeetingParticipantStatus =
  | "waiting"
  | "joined"
  | "left"
  | "removed"
  | "rejected";

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

export type MeetingPermissions = {
  canJoinMeeting: boolean;
  canAdmitOthers: boolean;
  canRemoveParticipants: boolean;
  canMuteOthers: boolean;
  canShareScreen: boolean;
  canUseWhiteboard: boolean;
  canSendChat: boolean;
  canStartRecording: boolean;
  canChangeSettings: boolean;
  canManageRoles: boolean;
  canLockMeeting: boolean;
  canUnmuteSelf: boolean;
};

export type MeetingRecord = {
  _id: string;
  title: string;
  purpose: string;
  description?: string;
  status: MeetingStatus;
  isLocked?: boolean;
  settings?: MeetingSettings;
  scheduledFor?: number;
  scheduledEndsAt?: number;
  startedAt?: number;
  endedAt?: number;
  activeParticipants?: number;
  waitingParticipants?: number;
  summary?: string | null;
  currentParticipant?: {
    _id: string;
    role: MeetingRole;
    status: MeetingParticipantStatus;
  } | null;
  effectivePermissions?: MeetingPermissions;
};
