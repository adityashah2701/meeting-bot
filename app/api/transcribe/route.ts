import Groq from "groq-sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getTranscriptionConfig } from "@/lib/transcription/modes";
import { createLogger, metric, newRequestId } from "@/lib/observability/logger";
import {
  extractCleanText,
  isInstructionArtifact,
  isPromptLeak,
  type WhisperResponse,
} from "./transcript-filters";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TRANSCRIPTION_MODEL = "whisper-large-v3";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Groq retry policy for transient failures (429 / 5xx). Total added latency is
// bounded: base 250ms, doubling, capped, with jitter.
const GROQ_MAX_ATTEMPTS = 3;
const GROQ_BASE_BACKOFF_MS = 250;
const GROQ_MAX_BACKOFF_MS = 2_000;

function jsonEmpty(requestId: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ text: "", requestId, ...extra });
}

function getFileExtension(file: File): string {
  const filename = file.name || "";
  const lastSegment = filename.split(".").pop()?.toLowerCase();
  if (lastSegment && lastSegment !== filename.toLowerCase()) {
    return lastSegment;
  }
  const mimeType = file.type.toLowerCase();
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

async function getConvexToken(): Promise<string | null> {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) return null;
  if (clerkAuth.sessionClaims?.aud === "convex") {
    return await clerkAuth.getToken();
  }
  return await clerkAuth.getToken({ template: "convex" });
}

function isRetryableGroqError(error: unknown): boolean {
  if (error instanceof Groq.APIError) {
    const status = error.status ?? 0;
    return status === 429 || status === 408 || status >= 500;
  }
  // Network-level failures (fetch throws) are retryable.
  return error instanceof Error;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function transcribeWithRetry(
  file: File,
  config: ReturnType<typeof getTranscriptionConfig>,
): Promise<WhisperResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= GROQ_MAX_ATTEMPTS; attempt += 1) {
    try {
      return (await groq.audio.transcriptions.create({
        file,
        model: TRANSCRIPTION_MODEL,
        response_format: "verbose_json",
        language: config.language,
        prompt: config.prompt,
        temperature: 0,
      })) as unknown as WhisperResponse;
    } catch (error) {
      lastError = error;
      if (attempt >= GROQ_MAX_ATTEMPTS || !isRetryableGroqError(error)) {
        throw error;
      }
      const backoff = Math.min(
        GROQ_MAX_BACKOFF_MS,
        GROQ_BASE_BACKOFF_MS * 2 ** (attempt - 1),
      );
      const jitter = Math.floor(Math.random() * (backoff / 2));
      await sleep(backoff + jitter);
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  const log = createLogger({ route: "transcribe", requestId });

  try {
    // 1. Authenticate. The Groq call is expensive, so it is gated behind a
    //    real identity — no more anonymous IP-only access.
    const convexToken = await getConvexToken();
    if (!convexToken) {
      log.warn("unauthenticated");
      return NextResponse.json(
        { error: "Unauthorized", text: "", requestId },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const audioBlob = formData.get("audio") as File | null;
    const meetingIdRaw = formData.get("meetingId");
    const meetingId =
      typeof meetingIdRaw === "string" && meetingIdRaw ? meetingIdRaw : null;

    if (!meetingId) {
      return NextResponse.json(
        { error: "meetingId is required", text: "", requestId },
        { status: 400 },
      );
    }
    if (!audioBlob || audioBlob.size === 0) {
      return jsonEmpty(requestId);
    }
    if (audioBlob.size > MAX_AUDIO_BYTES) {
      log.warn("audio_too_large", { bytes: audioBlob.size });
      return NextResponse.json(
        { error: "Audio chunk too large", text: "", requestId },
        { status: 413 },
      );
    }

    // 2. Enforce meeting access + per-user quota inside Convex (horizontally
    //    correct, unlike the old per-instance in-memory limiter).
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      log.error("missing_convex_url");
      return NextResponse.json(
        { error: "Server misconfigured", text: "", requestId },
        { status: 500 },
      );
    }
    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);

    let quota: { allowed: boolean; retryAfterMs: number };
    try {
      quota = await convex.mutation(api.transcripts.index.consumeTranscriptionQuota, {
        meetingId: meetingId as Id<"meetings">,
      });
    } catch (error) {
      // assertMeetingAccess / requireIdentity throw here -> not authorized.
      log.warn("quota_denied", { reason: (error as Error).message });
      return NextResponse.json(
        { error: "Forbidden", text: "", requestId },
        { status: 403 },
      );
    }

    if (!quota.allowed) {
      const retryAfterSec = Math.ceil(quota.retryAfterMs / 1000);
      metric("transcribe.rate_limited", 1, { meetingId });
      return NextResponse.json(
        { error: "Too many transcription requests", text: "", requestId },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    // 3. Transcribe via Groq with bounded retry/backoff.
    const extension = getFileExtension(audioBlob);
    const file = new File(
      [audioBlob],
      audioBlob.name || `audio.${extension}`,
      { type: audioBlob.type || `audio/${extension}` },
    );
    const config = getTranscriptionConfig(formData.get("mode"));

    const groqStartedAt = Date.now();
    const response = await transcribeWithRetry(file, config);
    const groqLatencyMs = Date.now() - groqStartedAt;

    // 4. Clean + guard against prompt leakage / instruction artifacts.
    const { text, segmentsTotal, segmentsKept, dropReasons } = extractCleanText(
      response,
      config.scriptMode,
    );

    let finalText = text;
    let filterReason: string | undefined;

    if (segmentsTotal > 0 && segmentsKept === 0) {
      // Segments were returned by Groq but all dropped by quality thresholds.
      filterReason = "quality_filter";
    } else if (!finalText && segmentsTotal === 0) {
      // Groq returned genuinely empty output (no segments, no top-level text).
      filterReason = "groq_empty";
    } else if (finalText && isInstructionArtifact(finalText)) {
      finalText = "";
      filterReason = "instruction_artifact";
    } else if (finalText && isPromptLeak(finalText, config.prompt)) {
      finalText = "";
      filterReason = "prompt_leak";
    }

    metric("transcribe.groq_latency_ms", groqLatencyMs, { meetingId });
    metric("transcribe.segments_dropped", segmentsTotal - segmentsKept, { meetingId });
    log.info("transcribed", {
      meetingId,
      bytes: audioBlob.size,
      groqLatencyMs,
      totalLatencyMs: Date.now() - startedAt,
      segmentsTotal,
      segmentsKept,
      chars: finalText.length,
      outcome: finalText ? "ok" : "empty",
      ...(filterReason ? { filterReason } : {}),
      ...(Object.keys(dropReasons).length > 0 ? { dropReasons } : {}),
    });

    return NextResponse.json({ text: finalText, requestId });
  } catch (error) {
    const status = error instanceof Groq.APIError ? error.status || 502 : 500;
    log.error("transcribe_failed", {
      status,
      message: error instanceof Error ? error.message : String(error),
      totalLatencyMs: Date.now() - startedAt,
    });
    metric("transcribe.error", 1, { status });
    return NextResponse.json(
      { error: "Transcription failed", text: "", requestId },
      { status },
    );
  }
}
