import type { Doc } from "../_generated/dataModel";

export type MeetingInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeInviteEmailList(emails: string[]) {
  return [...new Set(emails.map(normalizeInviteEmail).filter(Boolean))];
}

export function resolveInviteStatus(
  invite: Pick<Doc<"meeting_invites">, "status" | "expiresAt">,
): MeetingInviteStatus {
  const baseStatus = invite.status ?? "pending";
  if (
    baseStatus === "accepted" ||
    baseStatus === "declined" ||
    baseStatus === "cancelled" ||
    baseStatus === "expired"
  ) {
    return baseStatus;
  }

  if (typeof invite.expiresAt === "number" && invite.expiresAt < Date.now()) {
    return "expired";
  }

  return "pending";
}

export function isInviteVisibleToRecipient(
  invite: Pick<Doc<"meeting_invites">, "status" | "expiresAt">,
) {
  const status = resolveInviteStatus(invite);
  return status === "pending" || status === "accepted" || status === "declined";
}
