import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";
import { consumeRateLimit } from "../lib/rateLimiter";

// Number of most-recent lines kept in the live meeting panel. History beyond
// this is available on the details page via `listPaged`.
const LIVE_TAIL_SIZE = 200;

// Transcription quota, enforced per authenticated user (not per IP). Chunked
// speech produces at most a few requests per second per speaker; this leaves
// generous burst headroom while capping abuse of the Groq quota.
const TRANSCRIBE_BUCKET_CAPACITY = 90;
const TRANSCRIBE_REFILL_TOKENS = 90;
const TRANSCRIBE_REFILL_WINDOW_MS = 60_000;

async function resolveSpeaker(
  ctx: MutationCtx,
  meetingId: Id<"meetings">,
  tokenIdentifier: string,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
) {
  const participant = await getMeetingParticipant(ctx, meetingId, tokenIdentifier);
  const speakerName =
    participant?.name ?? identity.name ?? identity.email ?? "Participant";
  const speakerId = participant?._id ?? identity.subject;
  return { participant, speakerName, speakerId };
}

/**
 * Inserts a transcript row unless one with the same `clientId` already exists
 * for this meeting (idempotency). Returns true if inserted.
 */
async function insertIfNew(
  ctx: MutationCtx,
  row: {
    meetingId: Id<"meetings">;
    speakerParticipantId?: Id<"meeting_participants">;
    speakerId: string;
    speakerName: string;
    text: string;
    timestamp: number;
    createdAt: number;
    clientId?: string;
  },
): Promise<boolean> {
  if (row.clientId) {
    const existing = await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_clientId", (q) =>
        q.eq("meetingId", row.meetingId).eq("clientId", row.clientId),
      )
      .first();
    if (existing) return false;
  }
  await ctx.db.insert("transcripts", row);
  return true;
}

export const add = mutation({
  args: {
    meetingId: v.id("meetings"),
    text: v.string(),
    timestamp: v.number(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const { participant, speakerName, speakerId } = await resolveSpeaker(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
      identity,
    );

    await insertIfNew(ctx, {
      meetingId: args.meetingId,
      speakerParticipantId: participant?._id,
      speakerId,
      speakerName,
      text: args.text,
      timestamp: args.timestamp,
      createdAt: Date.now(),
      clientId: args.clientId,
    });
    // NOTE: intentionally does NOT patch meetings.lastActivityAt. Meeting
    // liveness is already tracked by participants.heartbeat; patching the
    // meeting document on every transcript write created OCC contention on a
    // single hot document under concurrent speakers.
  },
});

export const addBatch = mutation({
  args: {
    meetingId: v.id("meetings"),
    entries: v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
        // Stable dedup key. Optional for backwards compatibility with older
        // clients, but always sent by the current pipeline.
        clientId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const { participant, speakerName, speakerId } = await resolveSpeaker(
      ctx,
      args.meetingId,
      identity.tokenIdentifier,
      identity,
    );

    // Trim, drop empties, and de-duplicate within the batch by clientId so a
    // retried flush that re-sends the same segment twice is collapsed here
    // before hitting the (also idempotent) insert.
    const seen = new Set<string>();
    const entries = args.entries
      .map((entry) => ({
        text: entry.text.trim(),
        timestamp: entry.timestamp,
        clientId: entry.clientId,
      }))
      .filter((entry) => {
        if (!entry.text) return false;
        if (entry.clientId) {
          if (seen.has(entry.clientId)) return false;
          seen.add(entry.clientId);
        }
        return true;
      });

    if (entries.length === 0) {
      return 0;
    }

    const now = Date.now();
    let inserted = 0;
    for (const entry of entries) {
      const didInsert = await insertIfNew(ctx, {
        meetingId: args.meetingId,
        speakerParticipantId: participant?._id,
        speakerId,
        speakerName,
        text: entry.text,
        timestamp: entry.timestamp,
        createdAt: now,
        clientId: entry.clientId,
      });
      if (didInsert) inserted += 1;
    }

    // See `add`: liveness is tracked by heartbeat, not by transcript writes.
    return inserted;
  },
});

/**
 * Enforces per-user transcription quota AND meeting access before the
 * `/api/transcribe` route spends a Groq call. Runs as a mutation because the
 * token bucket is stateful. Returns whether the request may proceed.
 */
export const consumeTranscriptionQuota = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    const result = await consumeRateLimit(
      ctx,
      `transcribe:${identity.tokenIdentifier}`,
      {
        capacity: TRANSCRIBE_BUCKET_CAPACITY,
        refillTokens: TRANSCRIBE_REFILL_TOKENS,
        windowMs: TRANSCRIBE_REFILL_WINDOW_MS,
      },
    );

    return { allowed: result.allowed, retryAfterMs: result.retryAfterMs };
  },
});

/**
 * Bounded live tail for the in-meeting transcript panel. Returns the most
 * recent lines in ascending (chronological) order. Reactive, so it re-runs on
 * each insert — bounding it keeps that cost constant regardless of meeting
 * length. Full history is served by `listPaged`.
 */
export const listLive = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    const newestFirst = await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_timestamp", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("desc")
      .take(LIVE_TAIL_SIZE);
    return newestFirst.reverse();
  },
});

/**
 * Paginated full transcript history for the meeting details page. Ascending
 * order. Avoids the silent truncation of a fixed `.take()`.
 */
export const listPaged = query({
  args: {
    meetingId: v.id("meetings"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_timestamp", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Bounded ascending transcript list. Retained for server-side consumers that
 * need a plain array (e.g. the Notion export action in
 * `convex/integrations/index.ts`). UI surfaces should use `listLive` /
 * `listPaged` instead.
 */
export const list = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("transcripts")
      .withIndex("by_meetingId_and_timestamp", (q) =>
        q.eq("meetingId", args.meetingId),
      )
      .order("asc")
      .take(1000);
  },
});
