import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Convex-native token-bucket rate limiter.
 *
 * State lives in the `rate_limits` table, one document per `key`. Because each
 * key gets its own row (e.g. `transcribe:<tokenIdentifier>`), concurrent
 * callers with different keys never contend, and a single user's writes never
 * touch the meeting hot document.
 *
 * This must be called from a mutation (it writes bucket state). It refills
 * continuously based on elapsed time, so there are no fixed window edges to
 * game.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until at least one token is available again. 0 if allowed. */
  retryAfterMs: number;
  /** Tokens remaining after this call (floored at 0). */
  remaining: number;
};

export type RateLimitOptions = {
  /** Bucket capacity == max burst. */
  capacity: number;
  /** Tokens added per `windowMs`. Sustained rate = refillTokens / windowMs. */
  refillTokens: number;
  /** Refill window in milliseconds. */
  windowMs: number;
  /** Tokens to consume for this call. Defaults to 1. */
  cost?: number;
};

export async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  options: RateLimitOptions,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const { capacity, refillTokens, windowMs } = options;
  const cost = options.cost ?? 1;
  const refillPerMs = refillTokens / windowMs;

  const existing = await ctx.db
    .query("rate_limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  // Reconstruct current token count from stored state + elapsed refill.
  let tokens = capacity;
  if (existing) {
    const elapsed = Math.max(0, now - existing.updatedAt);
    tokens = Math.min(capacity, existing.tokens + elapsed * refillPerMs);
  }

  if (tokens < cost) {
    const deficit = cost - tokens;
    const retryAfterMs = Math.ceil(deficit / refillPerMs);
    // Persist the refilled (but not consumed) state so the next call sees an
    // accurate baseline.
    await persist(ctx, existing?._id, key, tokens, now);
    return { allowed: false, retryAfterMs, remaining: Math.floor(tokens) };
  }

  const remaining = tokens - cost;
  await persist(ctx, existing?._id, key, remaining, now);
  return { allowed: true, retryAfterMs: 0, remaining: Math.floor(remaining) };
}

async function persist(
  ctx: MutationCtx,
  id: Id<"rate_limits"> | undefined,
  key: string,
  tokens: number,
  now: number,
) {
  if (id) {
    await ctx.db.patch(id, { tokens, updatedAt: now });
  } else {
    await ctx.db.insert("rate_limits", { key, tokens, updatedAt: now });
  }
}
