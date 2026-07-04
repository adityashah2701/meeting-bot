"use client";

import { useEffect, useRef, useState } from "react";
import { newRequestId } from "@/lib/observability/logger";
import {
  startAudioCapture,
  type AudioCaptureHandle,
} from "@/features/ai/transcription/audio-capture";
import { TranscriptionUploader } from "@/features/ai/transcription/transcription-uploader";
import type { TranscriptionMode } from "@/lib/transcription/modes";

export type { TranscriptionMode } from "@/lib/transcription/modes";

/**
 * A finalized transcript line. `id` is the stable client dedup key
 * (`clientId`), and `timestamp` is the wall-clock time the audio was *spoken*
 * (capture time) — not when Whisper responded — so lines stay in speech order
 * even if responses arrive out of order.
 */
export type TranscriptLine = {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  isInterim?: boolean;
  timestamp: number;
};

/**
 * Thin orchestration hook. All heavy lifting lives in focused modules:
 * - `audio-capture` (worklet VAD, off main thread)
 * - `transcription-uploader` (backpressure, retry/backoff, idempotency)
 *
 * The hook only wires them to React lifecycle and surfaces status.
 */
export function useTranscription({
  enabled,
  stream,
  mode,
  userName,
  userId,
  meetingId,
  onTranscript,
}: {
  enabled: boolean;
  stream: MediaStream | null;
  mode: TranscriptionMode;
  userName: string;
  userId: string;
  meetingId: string;
  onTranscript: (line: TranscriptLine) => void;
}) {
  const modeRef = useRef(mode);
  const userNameRef = useRef(userName);
  const userIdRef = useRef(userId);
  const onTranscriptRef = useRef(onTranscript);
  const meetingIdRef = useRef(meetingId);

  const captureRef = useRef<AudioCaptureHandle | null>(null);
  const uploaderRef = useRef<TranscriptionUploader | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    userNameRef.current = userName;
    userIdRef.current = userId;
    onTranscriptRef.current = onTranscript;
    meetingIdRef.current = meetingId;
  }, [meetingId, mode, onTranscript, userId, userName]);

  useEffect(() => {
    if (!enabled || !stream || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const sessionId = newRequestId();

    const uploader = new TranscriptionUploader({
      meetingId: meetingIdRef.current,
      sessionId,
      getMode: () => modeRef.current,
      onResult: ({ clientId, text, captureStartTs }) => {
        onTranscriptRef.current({
          id: clientId,
          sender: userNameRef.current,
          senderId: userIdRef.current,
          text,
          timestamp: captureStartTs,
        });
      },
    });
    uploaderRef.current = uploader;

    startAudioCapture({
      stream,
      onSegment: (segment) => uploader.enqueue(segment),
      onError: () => {
        // Worklet load failure falls back to ScriptProcessor internally; only
        // surfaced errors reach here.
      },
    })
      .then((handle) => {
        if (cancelled) {
          void handle.stop();
          return;
        }
        captureRef.current = handle;
        setError(null);
        setIsListening(true);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Unable to start audio capture.");
          setIsListening(false);
        }
      });

    return () => {
      cancelled = true;
      setIsListening(false);
      const handle = captureRef.current;
      captureRef.current = null;
      uploaderRef.current = null;
      if (handle) void handle.stop();
      // Give any in-flight uploads a moment to finish delivering results before
      // tearing down; the sync layer handles durable persistence.
      uploader.dispose();
    };
  }, [enabled, stream]);

  return { isListening, error };
}
