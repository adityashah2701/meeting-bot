"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { AlertCircle, CircleDot, Clock3, Focus, Lock, Mic, MicOff, PanelRightClose, PanelRightOpen, Pin, Radio, ShieldAlert, StopCircle, Subtitles } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/loading-block";
import {
  meetingService,
  summarizeTranscript,
  type MeetingSummaryResult,
} from "@/features/meeting/services/meeting-service";
import {
  useTranscription,
  type TranscriptLine,
  type TranscriptionMode,
} from "@/features/ai/hooks/use-transcription";
import { useWebrtc } from "@/features/webrtc/hooks/use-webrtc";
import { ParticipantGrid } from "@/features/webrtc/components/participant-grid";
import { MeetingControls } from "@/features/webrtc/components/meeting-controls";
import { MeetingSidePanel } from "@/features/meeting/components/meeting-side-panel";

const AUTO_SUMMARY_INTERVAL_MS = 5 * 60 * 1000;
const TRANSCRIPTION_MODE_STORAGE_KEY = "meeting-bot-transcription-mode";
const RECORDING_TIMESLICE_MS = 1000;

type RecorderFormat = {
  mimeType: string;
  containerFormat: "mp4" | "webm";
};

type CroppableTrack = MediaStreamTrack & {
  cropTo?: (cropTarget: unknown) => Promise<void>;
};

type CropTargetWindow = Window & {
  CropTarget?: {
    fromElement: (element: Element) => Promise<unknown>;
  };
};

const RECORDING_FORMAT_CANDIDATES: RecorderFormat[] = [
  { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', containerFormat: "mp4" },
  { mimeType: "video/mp4", containerFormat: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", containerFormat: "webm" },
  { mimeType: "video/webm;codecs=vp8,opus", containerFormat: "webm" },
  { mimeType: "video/webm", containerFormat: "webm" },
];

function pickSupportedRecordingFormat(): RecorderFormat | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  for (const format of RECORDING_FORMAT_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      return format;
    }
  }
  return null;
}

function getDefaultTranscriptionMode(): TranscriptionMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedMode = window.localStorage.getItem(TRANSCRIPTION_MODE_STORAGE_KEY);
  if (storedMode === "auto") {
    return "hindi_english_marathi";
  }
  if (
    storedMode === "hindi_english_marathi" ||
    storedMode === "hindi_english" ||
    storedMode === "hindi" ||
    storedMode === "marathi" ||
    storedMode === "english"
  ) {
    return storedMode;
  }

  const browserLanguages = navigator.languages.join(" ").toLowerCase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();

  if (
    browserLanguages.includes("hi") ||
    browserLanguages.includes("mr") ||
    browserLanguages.includes("en-in") ||
    timeZone.includes("kolkata")
  ) {
    return "hindi_english_marathi";
  }

  return "auto";
}

export function MeetingRoomPage({ meetingId }: { meetingId: Id<"meetings"> }) {
  const router = useRouter();
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const transcriptRows = useQuery(meetingService.listTranscripts, { meetingId });
  const recordings = useQuery(meetingService.listRecordings, { meetingId }) ?? [];
  const addTranscriptBatch = useMutation(meetingService.addTranscriptBatch);
  const saveSummary = useMutation(meetingService.saveSummary);
  const createTasksFromSummary = useMutation(meetingService.createTasksFromSummary);
  const endMeeting = useMutation(meetingService.endMeeting);
  const startRecording = useMutation(meetingService.startRecording);
  const stopRecording = useMutation(meetingService.stopRecording);
  const generateRecordingUploadUrl = useMutation(meetingService.generateRecordingUploadUrl);
  const markRecordingReady = useMutation(meetingService.markRecordingReady);
  const markRecordingFailed = useMutation(meetingService.markRecordingFailed);

  const [interimTranscript, setInterimTranscript] = useState<TranscriptLine | null>(null);
  const [queuedTranscriptLines, setQueuedTranscriptLines] = useState<TranscriptLine[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("auto");
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [compactRail, setCompactRail] = useState(false);
  const [showFloatingTranscript, setShowFloatingTranscript] = useState(false);
  const [transcriptDock, setTranscriptDock] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");
  const [isRecordingMedia, setIsRecordingMedia] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const dbTranscript = useMemo(() => transcriptRows ?? [], [transcriptRows]);
  const transcriptQueueRef = useRef<Array<{ text: string; timestamp: number }>>([]);
  const meetingCaptureRootRef = useRef<HTMLDivElement | null>(null);
  const recordingSessionRef = useRef<{
    recordingId: Id<"meeting_recordings">;
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    format: RecorderFormat;
    cleanup: () => void;
    isStopping: boolean;
  } | null>(null);
  const recordingUploadPromiseRef = useRef<Promise<void> | null>(null);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const meetingRef = useRef<typeof meeting | null>(null);
  meetingRef.current = meeting ?? null;

  const {
    participantId,
    participantStatus,
    localStream,
    cameraStream,
    presentationStream,
    remoteCameraStreams,
    remotePresentationStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    permissionDenied,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebrtc(meetingId);

  const transcript = useMemo(() => {
    const persisted = dbTranscript.map((entry) => ({
      id: entry._id,
      sender: entry.speakerName,
      senderId: entry.speakerId,
      text: entry.text,
      timestamp: entry.timestamp,
      isInterim: false,
    }));
    const withQueued = [...persisted, ...queuedTranscriptLines];
    const full = interimTranscript ? [...withQueued, interimTranscript] : withQueued;
    transcriptRef.current = full;
    return full;
  }, [dbTranscript, interimTranscript, queuedTranscriptLines]);

  useEffect(() => {
    setTranscriptionMode(getDefaultTranscriptionMode());
  }, []);

  // Batch flush interval
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const entries = transcriptQueueRef.current;
      if (entries.length === 0) return;
      transcriptQueueRef.current = [];
      addTranscriptBatch({ meetingId, entries })
        .then(() => { setQueuedTranscriptLines((cur) => cur.slice(entries.length)); })
        .catch(() => { transcriptQueueRef.current = [...entries, ...transcriptQueueRef.current]; });
    }, 1200);
    return () => window.clearInterval(intervalId);
  }, [addTranscriptBatch, meetingId]);

  const buildMeetingArtifacts = useCallback(async (): Promise<MeetingSummaryResult | null> => {
    const currentMeeting = meetingRef.current;
    if (!currentMeeting?.orgId) return null;
    const finalTranscript = transcriptRef.current
      .filter((line) => !line.isInterim)
      .map((line) => ({ sender: line.sender, text: line.text }));
    if (finalTranscript.length === 0) return null;

    const result = await summarizeTranscript(finalTranscript);
    await saveSummary({ 
      meetingId, 
      summary: result.summary,
      key_points: result.key_points,
      decisions: result.decisions,
      action_items: result.action_items,
    });
    if (result.actionItems.length > 0) {
      await createTasksFromSummary({ orgId: currentMeeting.orgId, meetingId, titles: result.actionItems });
    }
    return result;
  }, [createTasksFromSummary, meetingId, saveSummary]);

  // Periodic auto-summary every 5 minutes while meeting is active
  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const currentMeeting = meetingRef.current;
      if (!currentMeeting || currentMeeting.status === "ended") return;
      if (transcriptRef.current.filter((l) => !l.isInterim).length === 0) return;
      const toastId = toast.loading("AI is generating summary…");
      try {
        await buildMeetingArtifacts();
        toast.success("Summary updated automatically", { id: toastId });
      } catch { toast.dismiss(toastId); }
    }, AUTO_SUMMARY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [buildMeetingArtifacts]);

  const { isListening: isTranscribing, error: transcriptionError } = useTranscription({
    // Pause transcription when mic is muted — no point sending silent audio to Whisper
    enabled: Boolean(participantId && meeting?.status !== "ended" && !permissionDenied && !isAudioMuted),
    stream: localStream,
    mode: transcriptionMode,
    userId: participantId ?? "local",
    userName: "You",
    onTranscript: (line) => {
      // Whisper returns only final text — no interim lines
      setInterimTranscript(null);
      setQueuedTranscriptLines((cur) => [...cur, { ...line, id: `queued-${line.timestamp}` }]);
      transcriptQueueRef.current.push({ text: line.text, timestamp: line.timestamp });
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        TRANSCRIPTION_MODE_STORAGE_KEY,
        transcriptionMode,
      );
    }
  }, [transcriptionMode]);

  useEffect(() => {
    return () => {
      const session = recordingSessionRef.current;
      if (!session) {
        return;
      }
      session.cleanup();
      recordingSessionRef.current = null;
      recordingUploadPromiseRef.current = null;
    };
  }, []);

  // With the MediaRecorder pipeline, isTranscribing already accounts for enabled state
  const isActivelyTranscribing = isTranscribing;

  useEffect(() => {
    if (meeting?.status === "ended") {
      toast.info("This meeting has been ended by the host.");
      router.push("/meetings");
    }
  }, [meeting?.status, router]);

  if (meeting === undefined) return <LoadingBlock className="h-screen w-full" />;
  if (!meeting) return <div className="p-6 text-sm text-muted-foreground">Meeting not found.</div>;

  const currentParticipantStatus = meeting.currentParticipant?.status ?? participantStatus;
  const isJoined = currentParticipantStatus === "joined";
  const isHost = meeting.currentParticipant?.role === "host";
  const canRecord = isJoined && Boolean(meeting.effectivePermissions?.canStartRecording);
  const activeRecording = recordings.find((recording) => recording.status === "recording") ?? null;
  const isRecordingActive = Boolean(activeRecording || isRecordingMedia);
  const canToggleAudio = isJoined && (!isAudioMuted || Boolean(meeting.effectivePermissions?.canUnmuteSelf));
  const canToggleVideo = isJoined && meeting.currentParticipant?.role !== "viewer";
  const canShareScreen = isJoined && Boolean(meeting.effectivePermissions?.canShareScreen);
  const showMeetingLockBanner = isJoined && meeting.isLocked;
  const transcriptDockClass =
    transcriptDock === "top-left"
      ? "left-4 top-4"
      : transcriptDock === "top-right"
        ? "right-4 top-4"
        : transcriptDock === "bottom-left"
          ? "left-4 bottom-28"
          : "right-4 bottom-28";

  const createMeetingViewCaptureStream = async () => {
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        displaySurface: "browser",
      } as MediaTrackConstraints,
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
      monitorTypeSurfaces: "exclude",
    } as DisplayMediaStreamOptions & {
      preferCurrentTab?: boolean;
      selfBrowserSurface?: "exclude" | "include";
      surfaceSwitching?: "exclude" | "include";
      monitorTypeSurfaces?: "exclude" | "include";
    });

    const videoTrack = displayMedia.getVideoTracks()[0];
    if (!videoTrack) {
      for (const track of displayMedia.getTracks()) {
        track.stop();
      }
      throw new Error("No video track found for meeting recording");
    }

    const settings = videoTrack.getSettings();
    if (settings.displaySurface && settings.displaySurface !== "browser") {
      for (const track of displayMedia.getTracks()) {
        track.stop();
      }
      throw new Error("Please select only this meeting browser tab for recording");
    }

    const cropTargetWindow = window as CropTargetWindow;
    const croppableTrack = videoTrack as CroppableTrack;
    if (
      cropTargetWindow.CropTarget &&
      croppableTrack.cropTo &&
      meetingCaptureRootRef.current
    ) {
      try {
        const cropTarget = await cropTargetWindow.CropTarget.fromElement(
          meetingCaptureRootRef.current,
        );
        await croppableTrack.cropTo(cropTarget);
      } catch {
        // Crop support is browser-dependent; fallback is full tab capture.
      }
    }

    const displayAudioTracks = displayMedia.getAudioTracks();
    const hasDisplayAudio = displayAudioTracks.length > 0;
    const audioTrackIds = new Set<string>();
    const audioSources: MediaStream[] = [];

    if (hasDisplayAudio) {
      audioSources.push(new MediaStream(displayAudioTracks));
    }

    const localAudioTracks = localStream?.getAudioTracks() ?? [];
    if (localAudioTracks.length > 0) {
      audioSources.push(new MediaStream(localAudioTracks));
    }

    // Fallback: when browser does not provide tab audio, include remote meeting tracks.
    if (!hasDisplayAudio) {
      for (const stream of [
        ...Object.values(remoteCameraStreams),
        ...Object.values(remotePresentationStreams),
      ]) {
        const tracks = stream.getAudioTracks();
        if (tracks.length > 0) {
          audioSources.push(new MediaStream(tracks));
        }
      }
    }

    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    const sourceNodes: MediaStreamAudioSourceNode[] = [];

    for (const stream of audioSources) {
      const uniqueTracks = stream
        .getAudioTracks()
        .filter((track) => {
          if (audioTrackIds.has(track.id)) {
            return false;
          }
          audioTrackIds.add(track.id);
          return true;
        });
      if (uniqueTracks.length === 0) {
        continue;
      }

      if (!audioContext) {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
      }

      const sourceStream = new MediaStream(uniqueTracks);
      const sourceNode = audioContext.createMediaStreamSource(sourceStream);
      sourceNode.connect(audioDestination!);
      sourceNodes.push(sourceNode);
    }

    if (audioContext) {
      await audioContext.resume().catch(() => null);
    }

    const composedStream = new MediaStream([
      ...displayMedia.getVideoTracks(),
      ...(audioDestination?.stream.getAudioTracks() ?? []),
    ]);

    return {
      stream: composedStream,
      cleanup: () => {
        for (const node of sourceNodes) {
          node.disconnect();
        }
        if (audioContext) {
          void audioContext.close();
        }
        for (const track of composedStream.getTracks()) {
          track.stop();
        }
        for (const track of displayMedia.getTracks()) {
          track.stop();
        }
      },
    };
  };

  const finalizeRecordingUpload = async (
    session: {
      recordingId: Id<"meeting_recordings">;
      stream: MediaStream;
      chunks: Blob[];
      format: RecorderFormat;
      cleanup: () => void;
    },
  ) => {
    session.cleanup();

    setIsUploadingRecording(true);
    try {
      await stopRecording({
        meetingId,
        recordingId: session.recordingId,
        storageProvider: "convex_storage",
      });

      const blob = new Blob(session.chunks, { type: session.format.mimeType });
      if (blob.size === 0) {
        throw new Error("Recording has no media data");
      }

      const uploadUrl = await generateRecordingUploadUrl({ meetingId });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": session.format.mimeType },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Recording upload failed");
      }

      const payload = (await uploadResponse.json()) as { storageId?: Id<"_storage"> };
      if (!payload.storageId) {
        throw new Error("Upload completed but storage ID was missing");
      }

      await markRecordingReady({
        meetingId,
        recordingId: session.recordingId,
        storageId: payload.storageId,
        storageProvider: "convex_storage",
        storageLocation: String(payload.storageId),
        mimeType: session.format.mimeType,
        containerFormat: session.format.containerFormat,
      });

      toast.success(
        session.format.containerFormat === "mp4"
          ? "Recording uploaded in MP4"
          : "Recording uploaded in WebM (MP4 not supported by this browser)",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to process recording";
      await markRecordingFailed({
        meetingId,
        recordingId: session.recordingId,
        errorMessage: message,
      }).catch(() => null);
      toast.error(message);
    } finally {
      setIsUploadingRecording(false);
      setIsRecordingMedia(false);
    }
  };

  const waitForRecordingUpload = async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (recordingUploadPromiseRef.current) {
        await recordingUploadPromiseRef.current;
        return;
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, 100);
      });
    }
  };

  const handleLeave = async () => {
    if (isRecordingActive || isUploadingRecording) {
      toast.error("Stop recording and wait for upload before leaving the meeting");
      return;
    }

    try {
      let summaryGenerated = false;
      if (meeting.status !== "ended") {
        const toastId = toast.loading("Generating summary…");
        const artifacts = await buildMeetingArtifacts().catch(() => null);
        toast.dismiss(toastId);
        summaryGenerated = Boolean(artifacts);
      }
      toast.success(
        summaryGenerated
          ? "You left the meeting and summary was saved"
          : "You left the meeting",
      );
    } catch { toast.error("Unable to leave meeting cleanly"); }
    finally { router.push("/meetings"); }
  };

  const handleEndMeeting = async () => {
    try {
      if (isRecordingActive || isUploadingRecording) {
        const stopToastId = toast.loading("Stopping recording before ending meeting...");
        await handleStopRecording();
        toast.success("Recording saved to Convex storage", { id: stopToastId });
      }

      let summaryGenerated = false;
      if (meeting.status !== "ended") {
        const toastId = toast.loading("Generating final summary…", { duration: 10000 });
        const artifacts = await buildMeetingArtifacts().catch(() => null);
        await endMeeting({ meetingId });
        toast.dismiss(toastId);
        summaryGenerated = Boolean(artifacts);
      }
      toast.success(
        summaryGenerated
          ? "Meeting ended for all and summary was saved"
          : "Meeting ended for all",
      );
    } catch { toast.error("Unable to end meeting cleanly"); }
    finally { router.push("/meetings"); }
  };

  const handleStartRecording = async () => {
    if (recordingSessionRef.current) {
      toast.message("Recording is already in progress");
      return;
    }

    const format = pickSupportedRecordingFormat();
    if (!format) {
      toast.error("This browser does not support in-browser meeting recording");
      return;
    }

    let recordingId: Id<"meeting_recordings"> | null = null;

    try {
      recordingId = await startRecording({
        meetingId,
        storageProvider: "convex_storage",
      });

      const capture = await createMeetingViewCaptureStream();
      const stream = capture.stream;

      const recorder = new MediaRecorder(stream, { mimeType: format.mimeType });
      const session = {
        recordingId,
        recorder,
        stream,
        chunks: [] as Blob[],
        format,
        cleanup: capture.cleanup,
        isStopping: false,
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          session.chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        toast.error("Recording failed. Please restart recording.");
      };

      recorder.onstop = () => {
        const current = recordingSessionRef.current;
        if (!current || current.recordingId !== session.recordingId) {
          return;
        }
        recordingSessionRef.current = null;
        const uploadPromise = finalizeRecordingUpload({
          recordingId: current.recordingId,
          stream: current.stream,
          chunks: [...current.chunks],
          format: current.format,
          cleanup: current.cleanup,
        });
        recordingUploadPromiseRef.current = uploadPromise;
        void uploadPromise.finally(() => {
          if (recordingUploadPromiseRef.current === uploadPromise) {
            recordingUploadPromiseRef.current = null;
          }
        });
      };

      for (const track of stream.getVideoTracks()) {
        track.addEventListener(
          "ended",
          () => {
            const current = recordingSessionRef.current;
            if (!current || current.recordingId !== session.recordingId || current.isStopping) {
              return;
            }
            current.isStopping = true;
            current.recorder.stop();
          },
          { once: true },
        );
      }

      recordingSessionRef.current = session;
      setIsRecordingMedia(true);
      recorder.start(RECORDING_TIMESLICE_MS);

      if (format.containerFormat !== "mp4") {
        toast.message("Browser MP4 recording support unavailable. Using WebM.");
      } else {
        toast.success("Recording started (MP4)");
      }
    } catch (error) {
      if (recordingId) {
        await stopRecording({
          meetingId,
          recordingId,
          storageProvider: "convex_storage",
        }).catch(() => null);
        await markRecordingFailed({
          meetingId,
          recordingId,
          errorMessage: "Unable to start browser recording",
        }).catch(() => null);
      }
      toast.error(error instanceof Error ? error.message : "Unable to start recording");
    }
  };

  const handleStopRecording = async () => {
    const session = recordingSessionRef.current;

    if (session) {
      if (session.isStopping) {
        await waitForRecordingUpload();
        return;
      }
      try {
        session.isStopping = true;
        session.recorder.requestData();
        session.recorder.stop();
        toast.message("Stopping recording and uploading file...");
        await waitForRecordingUpload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to stop recording");
      }
      return;
    }

    if (!activeRecording) {
      return;
    }
    try {
      await stopRecording({
        meetingId,
        recordingId: activeRecording._id,
      });
      toast.success("Recording stopped");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to stop recording");
    }
  };

  return (
    <div ref={meetingCaptureRootRef} className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-border bg-background/95 px-4 py-2.5 lg:px-5 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-foreground lg:text-lg truncate">{meeting.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {/* Meeting status badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase text-primary">
              <Radio className="h-3 w-3" />
              <span>{meeting.status}</span>
            </div>

            {isRecordingActive ? (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 rounded-full text-xs"
                onClick={() => void handleStopRecording()}
                disabled={isUploadingRecording}
              >
                <StopCircle className="h-3.5 w-3.5" />
                {isUploadingRecording ? "Uploading..." : "Stop Recording"}
              </Button>
            ) : canRecord ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full text-xs"
                onClick={() => void handleStartRecording()}
                disabled={isUploadingRecording}
              >
                <CircleDot className="h-3.5 w-3.5 text-red-500" />
                Start Recording
              </Button>
            ) : null}

            {/* Transcription status indicator */}
            {permissionDenied ? (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive" title="Microphone access denied">
                <AlertCircle className="h-3 w-3" />
                <span>Mic blocked</span>
              </div>
            ) : isActivelyTranscribing ? (
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400" title="Transcription active">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <Mic className="h-3 w-3" />
                <span>Transcribing</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground" title="Transcription paused">
                <MicOff className="h-3 w-3" />
                <span>Mic off</span>
              </div>
            )}

            {transcriptionError && (
              <div className="hidden text-xs text-destructive" title={transcriptionError} />
            )}

            {/* Clock */}
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="rounded-full gap-1.5 text-xs"
              onClick={() => setIsSidebarOpen((cur) => !cur)}
            >
              {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {isSidebarOpen ? "Hide" : "Show"} Panel
            </Button>

            <Button
              size="sm"
              variant={focusMode ? "default" : "ghost"}
              className="rounded-full gap-1.5 text-xs"
              onClick={() => setFocusMode((cur) => !cur)}
            >
              <Focus className="h-4 w-4" />
              Focus
            </Button>

            <Button
              size="sm"
              variant={compactRail ? "default" : "ghost"}
              className="rounded-full gap-1.5 text-xs"
              onClick={() => setCompactRail((cur) => !cur)}
            >
              <Pin className="h-4 w-4" />
              Compact Rail
            </Button>

            <Button
              size="sm"
              variant={showFloatingTranscript ? "default" : "ghost"}
              className="rounded-full gap-1.5 text-xs"
              onClick={() => setShowFloatingTranscript((cur) => !cur)}
            >
              <Subtitles className="h-4 w-4" />
              Floating Transcript
            </Button>

            <select
              className="h-8 rounded-full border border-border bg-background px-3 text-xs"
              value={pinnedParticipantId ?? ""}
              onChange={(event) => setPinnedParticipantId(event.target.value || null)}
            >
              <option value="">No Pin</option>
              {participants.map((participant) => (
                <option key={participant._id} value={participant._id}>
                  Pin: {participant.name}
                </option>
              ))}
            </select>

            {showFloatingTranscript ? (
              <select
                className="h-8 rounded-full border border-border bg-background px-3 text-xs"
                value={transcriptDock}
                onChange={(event) => setTranscriptDock(event.target.value as typeof transcriptDock)}
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            ) : null}
          </div>
        </div>

        {/* Permissions denied banner */}
        {permissionDenied && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Camera/microphone access is blocked. Click the 🔒 lock icon in your browser&apos;s address bar,
              allow mic &amp; camera, then{" "}
              <button
                className="underline underline-offset-2 font-medium"
                onClick={() => window.location.reload()}
              >
                refresh
              </button>
              .
            </span>
          </div>
        )}
      </header>

      {/* ── Main body ── */}
      <div
        className={`grid min-h-0 flex-1 overflow-hidden pb-24 ${
          isSidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"
        }`}
      >
        <div className="min-h-0 overflow-hidden p-3 lg:p-5">
          {currentParticipantStatus === "waiting" ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
                <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">Waiting for admission</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You&apos;re in the lobby. A host or co-host needs to admit you before media connects.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => void handleLeave()}>
                  Leave room
                </Button>
              </div>
            </div>
          ) : currentParticipantStatus === "removed" || currentParticipantStatus === "rejected" ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">Meeting access unavailable</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {currentParticipantStatus === "removed"
                    ? "A host or co-host removed you from this meeting."
                    : "Your join request was rejected."}
                </p>
                <Button className="mt-6" variant="outline" onClick={() => void handleLeave()}>
                  Return to meetings
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0">
              {showMeetingLockBanner ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>The meeting is locked. New participants cannot join until a host unlocks it.</span>
                </div>
              ) : null}
              <ParticipantGrid
                localStream={localStream}
                cameraStream={cameraStream}
                presentationStream={presentationStream}
                remoteCameraStreams={remoteCameraStreams}
                remotePresentationStreams={remotePresentationStreams}
                participants={participants}
                localParticipantId={participantId}
                pinnedParticipantId={pinnedParticipantId}
                focusMode={focusMode}
                compactRail={compactRail}
              />
            </div>
          )}
        </div>

        {isSidebarOpen && currentParticipantStatus !== "removed" && currentParticipantStatus !== "rejected" ? (
          <div className="min-h-0 overflow-hidden border-l border-border bg-card">
            <MeetingSidePanel
              meetingId={meetingId}
              transcript={transcript}
              orgId={meeting.orgId}
              isActivelyTranscribing={isActivelyTranscribing}
              transcriptionMode={transcriptionMode}
              onTranscriptionModeChange={setTranscriptionMode}
            />
          </div>
        ) : null}
      </div>

      {/* ── Floating controls ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="pointer-events-auto">
          <MeetingControls
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            isHost={isHost}
            canToggleAudio={canToggleAudio}
            canToggleVideo={canToggleVideo}
            canShareScreen={canShareScreen}
            onToggleAudio={() => void toggleAudio()}
            onToggleVideo={() => void toggleVideo()}
            onToggleScreenShare={() => void (isScreenSharing ? stopScreenShare() : startScreenShare())}
            onLeave={() => void handleLeave()}
            onEndMeeting={() => void handleEndMeeting()}
          />
        </div>
      </div>

      {showFloatingTranscript ? (
        <div className={`fixed z-40 w-80 rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur ${transcriptDockClass}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Transcript
            </p>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowFloatingTranscript(false)}>
              Close
            </Button>
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {transcript.slice(-12).map((line) => (
              <div key={line.id} className="rounded-md border border-border/70 px-2 py-1.5">
                <p className="text-[11px] text-muted-foreground">{line.sender}</p>
                <p className="text-xs text-foreground">{line.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
