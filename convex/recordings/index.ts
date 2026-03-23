import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { assertMeetingAccess, requireIdentity } from "../lib/auth";
import { getMeetingParticipant } from "../lib/meetinghelpers";
import { hasMeetingPermission } from "../lib/meetingPermissions";

async function requireRecordingPermission(
  ctx: MutationCtx,
  meetingId: Id<"meetings">,
) {
  const identity = await requireIdentity(ctx);
  const meeting = await assertMeetingAccess(
    ctx,
    identity.tokenIdentifier,
    meetingId,
  );
  const participant = await getMeetingParticipant(
    ctx,
    meetingId,
    identity.tokenIdentifier,
  );

  if (
    !participant ||
    participant.status !== "joined" ||
    !hasMeetingPermission(meeting, participant, "canStartRecording")
  ) {
    throw new Error("You do not have permission to manage recordings");
  }

  return { identity, meeting, participant };
}

export const start = mutation({
  args: {
    meetingId: v.id("meetings"),
    storageProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, meeting, participant } = await requireRecordingPermission(
      ctx,
      args.meetingId,
    );

    const active = await ctx.db
      .query("meeting_recordings")
      .withIndex("by_meetingId_and_status", (q) =>
        q.eq("meetingId", args.meetingId).eq("status", "recording"),
      )
      .unique();

    if (active) {
      throw new Error("Recording is already in progress");
    }

    const now = Date.now();
    return await ctx.db.insert("meeting_recordings", {
      meetingId: args.meetingId,
      orgId: meeting.orgId,
      ownerParticipantId: participant._id,
      ownerTokenIdentifier: identity.tokenIdentifier,
      startedAt: now,
      stoppedAt: undefined,
      durationMs: undefined,
      status: "recording",
      storageProvider: args.storageProvider ?? undefined,
      storageLocation: undefined,
      playbackUrl: undefined,
      transcriptAssetId: undefined,
      summaryAssetId: undefined,
      errorMessage: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const stop = mutation({
  args: {
    meetingId: v.id("meetings"),
    recordingId: v.optional(v.id("meeting_recordings")),
    storageProvider: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    playbackUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRecordingPermission(ctx, args.meetingId);

    let recording = args.recordingId
      ? await ctx.db.get(args.recordingId)
      : null;

    if (!recording) {
      recording = await ctx.db
        .query("meeting_recordings")
        .withIndex("by_meetingId_and_status", (q) =>
          q.eq("meetingId", args.meetingId).eq("status", "recording"),
        )
        .unique();
    }

    if (!recording || recording.meetingId !== args.meetingId) {
      throw new Error("Active recording not found");
    }

    const now = Date.now();
    await ctx.db.patch(recording._id, {
      stoppedAt: now,
      durationMs: Math.max(0, now - recording.startedAt),
      status: "processing",
      storageProvider: args.storageProvider ?? recording.storageProvider,
      storageLocation: args.storageLocation ?? recording.storageLocation,
      playbackUrl: args.playbackUrl ?? recording.playbackUrl,
      updatedAt: now,
    });

    return recording._id;
  },
});

export const markReady = mutation({
  args: {
    meetingId: v.id("meetings"),
    recordingId: v.id("meeting_recordings"),
    playbackUrl: v.optional(v.string()),
    storageProvider: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    transcriptAssetId: v.optional(v.id("meeting_assets")),
    summaryAssetId: v.optional(v.id("meeting_assets")),
  },
  handler: async (ctx, args) => {
    await requireRecordingPermission(ctx, args.meetingId);
    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.meetingId !== args.meetingId) {
      throw new Error("Recording not found");
    }

    await ctx.db.patch(args.recordingId, {
      status: "ready",
      playbackUrl: args.playbackUrl ?? recording.playbackUrl,
      storageProvider: args.storageProvider ?? recording.storageProvider,
      storageLocation: args.storageLocation ?? recording.storageLocation,
      transcriptAssetId: args.transcriptAssetId ?? recording.transcriptAssetId,
      summaryAssetId: args.summaryAssetId ?? recording.summaryAssetId,
      errorMessage: undefined,
      updatedAt: Date.now(),
    });

    return args.recordingId;
  },
});

export const markFailed = mutation({
  args: {
    meetingId: v.id("meetings"),
    recordingId: v.id("meeting_recordings"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRecordingPermission(ctx, args.meetingId);
    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.meetingId !== args.meetingId) {
      throw new Error("Recording not found");
    }

    await ctx.db.patch(args.recordingId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    return args.recordingId;
  },
});

export const listByMeeting = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);
    return await ctx.db
      .query("meeting_recordings")
      .withIndex("by_meetingId_and_createdAt", (q) => q.eq("meetingId", args.meetingId))
      .order("desc")
      .take(100);
  },
});
