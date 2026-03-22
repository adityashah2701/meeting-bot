import type { QueryCtx, MutationCtx } from "../_generated/server";

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
