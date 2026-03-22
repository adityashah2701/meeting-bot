import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type ConvexCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: ConvexCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}

export function getIdentityName(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
) {
  return identity.name ?? identity.email ?? "Meeting Bot User";
}

export async function getCurrentUserRecord(
  ctx: ConvexCtx,
  tokenIdentifier: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();
}

export async function assertOrgAccess(
  ctx: ConvexCtx,
  tokenIdentifier: string,
  orgId: string,
) {
  const user = await getCurrentUserRecord(ctx, tokenIdentifier);
  if (!user || !user.orgIds.includes(orgId)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function assertMeetingAccess(
  ctx: ConvexCtx,
  tokenIdentifier: string,
  meetingId: Id<"meetings">,
) {
  const meeting = await ctx.db.get(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  await assertOrgAccess(ctx, tokenIdentifier, meeting.orgId);
  return meeting;
}

export function assertMeetingHost(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  meeting: Doc<"meetings">,
) {
  if (meeting.creatorTokenIdentifier !== identity.tokenIdentifier) {
    throw new Error("Only the host can perform this action");
  }
}
