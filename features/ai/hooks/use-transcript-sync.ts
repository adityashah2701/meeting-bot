"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { meetingService } from "@/features/meeting/services/meeting-service";
import type { TranscriptLine } from "@/features/ai/hooks/use-transcription";

const FLUSH_INTERVAL_MS = 1_200;

type PendingEntry = { text: string; timestamp: number; clientId: string };

/**
 * Owns durable persistence of locally-produced transcript lines, extracted out
 * of the meeting room god-component.
 *
 * Responsibilities:
 * - Hold optimistic (not-yet-persisted) lines for immediate display.
 * - Batch-flush pending entries to Convex on an interval AND on tab-hide, so a
 *   user closing the tab between ticks does not silently lose their last lines.
 * - Carry a stable `clientId` per line so `addBatch` is idempotent — a retried
 *   or re-fired flush never creates duplicate rows.
 *
 * Note: on hard tab-close the Convex mutation may not complete (Convex has no
 * `sendBeacon` transport); the visibility-hidden flush covers backgrounding and
 * most navigations, which is a strict improvement over the previous
 * "lost between ticks" behavior.
 */
export function useTranscriptSync({ meetingId }: { meetingId: Id<"meetings"> }) {
  const addTranscriptBatch = useMutation(meetingService.addTranscriptBatch);

  const [queuedLines, setQueuedLines] = useState<TranscriptLine[]>([]);
  const pendingRef = useRef<PendingEntry[]>([]);
  const seenClientIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    const entries = pendingRef.current;
    if (entries.length === 0) return;

    pendingRef.current = [];
    inFlightRef.current = true;
    const flushedIds = new Set(entries.map((entry) => entry.clientId));

    try {
      await addTranscriptBatch({ meetingId, entries });
      // Persisted rows now arrive via the reactive listLive query; drop the
      // optimistic copies to avoid showing each line twice.
      setQueuedLines((current) =>
        current.filter((line) => !flushedIds.has(line.id)),
      );
    } catch {
      // Re-queue for the next tick. clientId dedup makes the retry safe even if
      // some entries actually landed.
      pendingRef.current = [...entries, ...pendingRef.current];
    } finally {
      inFlightRef.current = false;
    }
  }, [addTranscriptBatch, meetingId]);

  const enqueue = useCallback((line: TranscriptLine) => {
    if (seenClientIdsRef.current.has(line.id)) return;
    seenClientIdsRef.current.add(line.id);

    setQueuedLines((current) => [...current, line]);
    pendingRef.current.push({
      text: line.text,
      timestamp: line.timestamp,
      clientId: line.id,
    });
  }, []);

  // Interval flush.
  useEffect(() => {
    const intervalId = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [flush]);

  // Flush on tab-hide / navigation so trailing lines are not lost.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [flush]);

  return { queuedLines, enqueueTranscript: enqueue, flushTranscripts: flush };
}
