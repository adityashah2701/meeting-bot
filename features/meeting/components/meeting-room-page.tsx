"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { PenSquare } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/loading-block";
import { useSyncOrganizationBilling } from "@/features/billing/hooks/use-sync-organization-billing";
import { billingService } from "@/features/billing/services/billing-service";
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
import { useTranscriptSync } from "@/features/ai/hooks/use-transcript-sync";
import { useWebrtc } from "@/features/webrtc/hooks/use-webrtc";
import { ParticipantGrid } from "@/features/webrtc/components/participant-grid";
import { CommandBar } from "@/features/meeting/components/command-bar";
import { MoreMenu } from "@/features/meeting/components/more-menu";
import { RoomShell } from "@/features/meeting/components/room-shell";
import type { RoomAiStatus } from "@/features/meeting/components/room-top-bar";
import { ShortcutsDialog } from "@/features/meeting/components/shortcuts-dialog";
import { useMeetingShortcuts } from "@/features/meeting/hooks/use-meeting-shortcuts";
import { MeetingSettingsPanel } from "@/features/meeting/components/meeting-settings-panel";
import { MeetingWhiteboard } from "@/features/meeting/components/meeting-whiteboard";
import { MeetingReactionsOverlay } from "@/features/meeting/components/meeting-reactions-overlay";
import type { MeetingReactionEmoji } from "@/features/meeting/lib/reactions";

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
  useSyncOrganizationBilling(meeting?.orgId);
  const transcriptRows = useQuery(meetingService.listLiveTranscripts, { meetingId });
  const recordings = useQuery(meetingService.listRecordings, { meetingId }) ?? [];
  const billing = useQuery(
    billingService.getOrganizationPlan,
    meeting?.orgId ? { orgId: meeting.orgId } : "skip",
  );
  const whiteboard = useQuery(meetingService.getWhiteboard, { meetingId });
  const saveSummary = useMutation(meetingService.saveSummary);
  const setWhiteboardOpen = useMutation(meetingService.setWhiteboardOpen);
  const saveWhiteboardScene = useMutation(meetingService.saveWhiteboardScene);
  const createTasksFromSummary = useMutation(meetingService.createTasksFromSummary);
  const endMeeting = useMutation(meetingService.endMeeting);
  const startRecording = useMutation(meetingService.startRecording);
  const stopRecording = useMutation(meetingService.stopRecording);
  const generateRecordingUploadUrl = useMutation(meetingService.generateRecordingUploadUrl);
  const markRecordingReady = useMutation(meetingService.markRecordingReady);
  const markRecordingFailed = useMutation(meetingService.markRecordingFailed);
  const sendReaction = useMutation(meetingService.sendReaction);

  const { queuedLines, enqueueTranscript } = useTranscriptSync({ meetingId });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("auto");
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isRecordingMedia, setIsRecordingMedia] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [isMeetingSettingsOpen, setIsMeetingSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const dbTranscript = useMemo(() => transcriptRows ?? [], [transcriptRows]);
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
  const liveReactions = useQuery(
    meetingService.listReactions,
    participantStatus === "joined" || meeting?.currentParticipant?.status === "joined"
      ? { meetingId }
      : "skip",
  );

  const transcript = useMemo(() => {
    const persisted = dbTranscript.map((entry) => ({
      id: entry._id,
      sender: entry.speakerName,
      senderId: entry.speakerId,
      text: entry.text,
      timestamp: entry.timestamp,
      isInterim: false,
    }));
    // Merge persisted (all speakers) with this client's optimistic lines and
    // sort by capture timestamp so speech stays in chronological order even
    // when local lines have not yet round-tripped through Convex.
    const full = [...persisted, ...queuedLines].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    transcriptRef.current = full;
    return full;
  }, [dbTranscript, queuedLines]);

  const lastCaptionLine = useMemo(() => {
    const finalLines = transcript.filter((line) => !line.isInterim);
    const line = transcript[transcript.length - 1] ?? finalLines[finalLines.length - 1] ?? null;
    return line ? { id: line.id, sender: line.sender, text: line.text } : null;
  }, [transcript]);

  useEffect(() => {
    setTranscriptionMode(getDefaultTranscriptionMode());
  }, []);

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
    if (result.action_items.length > 0) {
      await createTasksFromSummary({
        orgId: currentMeeting.orgId,
        meetingId,
        actionItems: result.action_items.map((item) => ({
          title: item.task,
          assigneeName: item.assignee,
        })),
      });
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

  const { isListening: isTranscribing } = useTranscription({
    // Pause transcription when mic is muted — no point sending silent audio to Whisper
    enabled: Boolean(participantId && meeting?.status !== "ended" && !permissionDenied && !isAudioMuted),
    stream: localStream,
    mode: transcriptionMode,
    meetingId,
    userId: participantId ?? "local",
    userName: "You",
    // Each line carries a stable clientId (line.id) and a capture-time
    // timestamp; the sync hook persists it idempotently.
    onTranscript: enqueueTranscript,
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
      if (meeting?.status !== "ended") {
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
      if (meeting?.status !== "ended") {
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

  const handleSendReaction = async (emoji: MeetingReactionEmoji) => {
    try {
      await sendReaction({ meetingId, emoji });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send reaction",
      );
    }
  };

  const activeRecording = recordings.find((recording) => recording.status === "recording") ?? null;
  const isRecordingActive = Boolean(activeRecording || isRecordingMedia);

  useMeetingShortcuts({
    enabled: meeting?.currentParticipant?.status === "joined",
    onToggleMic: () => void toggleAudio(),
    onToggleCamera: () => void toggleVideo(),
    onToggleScreenShare: () => void (isScreenSharing ? stopScreenShare() : startScreenShare()),
    onTogglePanel: () => setIsSidebarOpen((cur) => !cur),
    onShowShortcuts: () => setIsShortcutsOpen(true),
  });

  if (meeting === undefined || whiteboard === undefined) return <LoadingBlock className="h-screen w-full" />;
  if (!meeting) return <div className="p-6 text-sm text-muted-foreground">Meeting not found.</div>;

  const currentParticipantStatus = meeting.currentParticipant?.status ?? participantStatus;
  const isJoined = currentParticipantStatus === "joined";
  const isHost = meeting.currentParticipant?.role === "host";
  const canRecord = isJoined && Boolean(meeting.effectivePermissions?.canStartRecording);
  const recordingLockedByPlan = billing?.features.recording === false;
  const canToggleAudio = isJoined && (!isAudioMuted || Boolean(meeting.effectivePermissions?.canUnmuteSelf));
  const canToggleVideo = isJoined && meeting.currentParticipant?.role !== "viewer";
  const canShareScreen = isJoined && Boolean(meeting.effectivePermissions?.canShareScreen);
  const canUseWhiteboard = isJoined && Boolean(meeting.effectivePermissions?.canUseWhiteboard);
  const canChangeSettings = Boolean(meeting.effectivePermissions?.canChangeSettings);
  const isWhiteboardOpen = Boolean(whiteboard?.isOpen);
  const canReact = isJoined && Boolean(meeting.settings.allowReactions);
  const hasActivePresentation =
    isScreenSharing || participants.some((participant) => participant.isScreenSharing);
  const whiteboardOwnerLabel = whiteboard?.updatedByName?.trim() || "Someone";

  const aiStatus: RoomAiStatus = permissionDenied ? "blocked" : isActivelyTranscribing ? "transcribing" : "idle";
  const stageBanner =
    currentParticipantStatus === "waiting"
      ? "waiting"
      : currentParticipantStatus === "removed" || currentParticipantStatus === "rejected"
        ? currentParticipantStatus
        : null;

  const whiteboardStage =
    isWhiteboardOpen && !hasActivePresentation ? (
      <div className="flex h-full min-h-0 flex-col bg-card">
        <div className="flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm">
              <PenSquare className="h-3.5 w-3.5 text-primary" />
              Shared whiteboard
            </div>
            <div className="inline-flex items-center rounded-full bg-primary/8 px-3 py-1 text-xs text-muted-foreground">
              Live for everyone · opened by {whiteboardOwnerLabel}
            </div>
          </div>
          {canUseWhiteboard ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-full text-xs"
              onClick={() => {
                void setWhiteboardOpen({ meetingId, isOpen: false }).catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Unable to close whiteboard");
                });
              }}
            >
              <PenSquare className="h-3.5 w-3.5" />
              Close
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 bg-card p-2">
          <div className="h-full w-full overflow-hidden rounded-xl">
            <MeetingWhiteboard
              meetingId={meetingId}
              canEdit={canUseWhiteboard}
              serializedScene={whiteboard?.scene ?? null}
              onSaveScene={async (scene) => {
                try {
                  await saveWhiteboardScene({ meetingId, scene });
                } catch (error) {
                  console.error("Unable to sync whiteboard", error);
                }
              }}
            />
          </div>
        </div>
      </div>
    ) : undefined;

  const stage = (
    <div className="relative h-full min-h-0">
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
        stage={whiteboardStage}
      />
      {isJoined ? <MeetingReactionsOverlay reactions={liveReactions ?? []} /> : null}
    </div>
  );

  const moreMenu = (
    <MoreMenu
      focusMode={focusMode}
      onFocusModeChange={setFocusMode}
      isWhiteboardOpen={isWhiteboardOpen}
      canUseWhiteboard={canUseWhiteboard}
      hasActivePresentation={hasActivePresentation}
      whiteboardOwnerLabel={whiteboardOwnerLabel}
      onToggleWhiteboard={() => {
        if (!canUseWhiteboard) return;
        void setWhiteboardOpen({ meetingId, isOpen: !isWhiteboardOpen }).catch((error) => {
          toast.error(error instanceof Error ? error.message : "Unable to update whiteboard");
        });
      }}
      participants={participants}
      pinnedParticipantId={pinnedParticipantId}
      onPinnedParticipantChange={setPinnedParticipantId}
      canChangeSettings={canChangeSettings}
      onOpenSettings={() => setIsMeetingSettingsOpen(true)}
      onOpenShortcuts={() => setIsShortcutsOpen(true)}
    />
  );

  const commandBar = (
    <CommandBar
      isAudioMuted={isAudioMuted}
      isVideoOff={isVideoOff}
      isScreenSharing={isScreenSharing}
      isHost={isHost}
      canToggleAudio={canToggleAudio}
      canToggleVideo={canToggleVideo}
      canShareScreen={canShareScreen}
      canReact={canReact}
      onToggleAudio={() => void toggleAudio()}
      onToggleVideo={() => void toggleVideo()}
      onToggleScreenShare={() => void (isScreenSharing ? stopScreenShare() : startScreenShare())}
      onSendReaction={(emoji) => void handleSendReaction(emoji)}
      onLeave={() => void handleLeave()}
      onEndMeeting={() => void handleEndMeeting()}
      showRecordToggle={canRecord || isRecordingActive}
      isRecordingActive={isRecordingActive}
      isRecordingDisabled={isUploadingRecording}
      recordingLockedByPlan={recordingLockedByPlan}
      onToggleRecording={() =>
        void (isRecordingActive ? handleStopRecording() : handleStartRecording())
      }
      moreMenu={moreMenu}
    />
  );

  return (
    <>
      <RoomShell
        captureRootRef={meetingCaptureRootRef}
        title={meeting.title}
        isLive={meeting.status === "active"}
        startedAt={meeting.startedAt}
        topBarParticipants={participants}
        aiStatus={aiStatus}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((cur) => !cur)}
        lockedBanner={isJoined && meeting.isLocked}
        blockedBanner={permissionDenied}
        onRefreshPermissions={() => window.location.reload()}
        stageBanner={stageBanner}
        onStageBannerAction={() => void handleLeave()}
        stage={stage}
        captionLine={isActivelyTranscribing ? lastCaptionLine : null}
        meetingId={meetingId}
        orgId={meeting.orgId}
        transcript={transcript}
        isActivelyTranscribing={isActivelyTranscribing}
        transcriptionMode={transcriptionMode}
        onTranscriptionModeChange={setTranscriptionMode}
        commandBar={commandBar}
      />

      <ShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />

      {canChangeSettings ? (
        <MeetingSettingsPanel
          meetingId={meetingId}
          open={isMeetingSettingsOpen}
          onOpenChange={setIsMeetingSettingsOpen}
        />
      ) : null}
    </>
  );
}
