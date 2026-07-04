/**
 * Uploads voiced audio segments to `/api/transcribe` with:
 * - bounded concurrency (backpressure — a choppy speaker can no longer open an
 *   unbounded number of concurrent Groq requests)
 * - exponential backoff + jitter on transient failures, honoring `Retry-After`
 * - a stable `clientId` per segment so retries are idempotent end-to-end
 * - a bounded pending queue that sheds the oldest work (with a reported drop)
 *   rather than growing without limit during a network stall
 *
 * The uploader's output is text keyed by `clientId` + the original capture
 * timestamp; ordering is the consumer's responsibility and is preserved via the
 * monotonic `seq`.
 */
import type { TranscriptionMode } from "@/lib/transcription/modes";
import { encodeWav } from "./wav-encoder";
import type { CapturedSegment } from "./audio-capture";

export type TranscriptionResult = {
  clientId: string;
  text: string;
  captureStartTs: number;
  seq: number;
};

export type UploaderOptions = {
  meetingId: string;
  /** Stable per-capture-session id; combined with seq to form clientId. */
  sessionId: string;
  /** Read the current mode lazily so mode changes take effect immediately. */
  getMode: () => TranscriptionMode;
  onResult: (result: TranscriptionResult) => void;
  onDrop?: (info: { clientId: string; seq: number; reason: string }) => void;
  maxConcurrent?: number;
  maxQueue?: number;
  maxAttempts?: number;
};

const MIN_WAV_BYTES = 1000;
const DEFAULT_MAX_CONCURRENT = 3;
const DEFAULT_MAX_QUEUE = 24;
const DEFAULT_MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 8_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PendingItem = {
  clientId: string;
  seq: number;
  captureStartTs: number;
  blob: Blob;
};

export class TranscriptionUploader {
  private readonly options: Required<
    Pick<UploaderOptions, "maxConcurrent" | "maxQueue" | "maxAttempts">
  > &
    UploaderOptions;
  private queue: PendingItem[] = [];
  private active = 0;
  private disposed = false;

  constructor(options: UploaderOptions) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT,
      maxQueue: options.maxQueue ?? DEFAULT_MAX_QUEUE,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      ...options,
    };
  }

  enqueue(segment: CapturedSegment): void {
    if (this.disposed) return;
    const blob = encodeWav(segment.pcm, segment.sampleRate);
    if (blob.size < MIN_WAV_BYTES) return;

    const clientId = `${this.options.sessionId}:${segment.seq}`;
    const item: PendingItem = {
      clientId,
      seq: segment.seq,
      captureStartTs: segment.captureStartTs,
      blob,
    };

    this.queue.push(item);
    // Shed oldest under sustained overload so memory stays bounded.
    while (this.queue.length > this.options.maxQueue) {
      const dropped = this.queue.shift();
      if (dropped) {
        this.options.onDrop?.({
          clientId: dropped.clientId,
          seq: dropped.seq,
          reason: "queue_overflow",
        });
      }
    }
    this.pump();
  }

  /** Number of items queued or in-flight. */
  get pending(): number {
    return this.queue.length + this.active;
  }

  dispose(): void {
    this.disposed = true;
    this.queue = [];
  }

  private pump(): void {
    while (
      !this.disposed &&
      this.active < this.options.maxConcurrent &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift();
      if (!item) break;
      this.active += 1;
      void this.process(item).finally(() => {
        this.active -= 1;
        this.pump();
      });
    }
  }

  private async process(item: PendingItem): Promise<void> {
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt += 1) {
      if (this.disposed) return;
      try {
        const outcome = await this.send(item);
        if (outcome.kind === "ok") {
          const text = outcome.text.trim();
          if (text) {
            this.options.onResult({
              clientId: item.clientId,
              text,
              captureStartTs: item.captureStartTs,
              seq: item.seq,
            });
          }
          return;
        }
        if (outcome.kind === "fatal") {
          this.options.onDrop?.({
            clientId: item.clientId,
            seq: item.seq,
            reason: `http_${outcome.status}`,
          });
          return;
        }
        // Retryable — fall through to backoff below.
        if (attempt >= this.options.maxAttempts) {
          this.options.onDrop?.({
            clientId: item.clientId,
            seq: item.seq,
            reason: "max_attempts",
          });
          return;
        }
        await sleep(this.backoff(attempt, outcome.retryAfterMs));
      } catch {
        // Network error — retryable.
        if (attempt >= this.options.maxAttempts) {
          this.options.onDrop?.({
            clientId: item.clientId,
            seq: item.seq,
            reason: "network",
          });
          return;
        }
        await sleep(this.backoff(attempt));
      }
    }
  }

  private async send(
    item: PendingItem,
  ): Promise<
    | { kind: "ok"; text: string }
    | { kind: "retry"; retryAfterMs?: number }
    | { kind: "fatal"; status: number }
  > {
    const form = new FormData();
    form.append("audio", new File([item.blob], "chunk.wav", { type: "audio/wav" }));
    form.append("mode", this.options.getMode());
    form.append("meetingId", this.options.meetingId);
    form.append("clientId", item.clientId);

    const res = await fetch("/api/transcribe", { method: "POST", body: form });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { text?: string };
      return { kind: "ok", text: data.text ?? "" };
    }

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = res.headers.get("Retry-After");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
      return { kind: "retry", retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined };
    }

    // 4xx (except 429): auth/validation — not worth retrying.
    return { kind: "fatal", status: res.status };
  }

  private backoff(attempt: number, retryAfterMs?: number): number {
    if (retryAfterMs && retryAfterMs > 0) {
      return Math.min(MAX_BACKOFF_MS, retryAfterMs);
    }
    const base = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempt - 1));
    return base + Math.floor(Math.random() * (base / 2));
  }
}
