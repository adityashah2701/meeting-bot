"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { AlertCircle, Clock3, Mic, MicOff, PanelRightClose, PanelRightOpen, Radio } from "lucide-react";
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

function getDefaultTranscriptionMode(): TranscriptionMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedMode = window.localStorage.getItem(TRANSCRIPTION_MODE_STORAGE_KEY);
  if (
    storedMode === "auto" ||
    storedMode === "hinglish" ||
    storedMode === "hindi" ||
    storedMode === "english"
  ) {
    return storedMode;
  }

  const browserLanguages = navigator.languages.join(" ").toLowerCase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();

  if (
    browserLanguages.includes("hi") ||
    browserLanguages.includes("en-in") ||
    timeZone.includes("kolkata")
  ) {
    return "hinglish";
  }

  return "auto";
}

export function MeetingRoomPage({ meetingId }: { meetingId: Id<"meetings"> }) {
  const router = useRouter();
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const transcriptRows = useQuery(meetingService.listTranscripts, { meetingId });
  const addTranscriptBatch = useMutation(meetingService.addTranscriptBatch);
  const endMeeting = useMutation(meetingService.endMeeting);
  const saveSummary = useMutation(meetingService.saveSummary);
  const createTasksFromSummary = useMutation(meetingService.createTasksFromSummary);

  const [interimTranscript, setInterimTranscript] = useState<TranscriptLine | null>(null);
  const [queuedTranscriptLines, setQueuedTranscriptLines] = useState<TranscriptLine[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("auto");
  const dbTranscript = useMemo(() => transcriptRows ?? [], [transcriptRows]);
  const transcriptQueueRef = useRef<Array<{ text: string; timestamp: number }>>([]);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting ?? null;

  const {
    participantId,
    localStream,
    presentationStream,
    remoteStreams,
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

  // With the MediaRecorder pipeline, isTranscribing already accounts for enabled state
  const isActivelyTranscribing = isTranscribing;

  if (meeting === undefined) return <LoadingBlock className="h-screen w-full" />;
  if (!meeting) return <div className="p-6 text-sm text-muted-foreground">Meeting not found.</div>;

  const handleLeave = async () => {
    try {
      let summaryGenerated = false;
      if (meeting.status !== "ended") {
        const toastId = toast.loading("Generating summary…");
        const artifacts = await buildMeetingArtifacts().catch(() => null);
        toast.dismiss(toastId);
        summaryGenerated = Boolean(artifacts);
      }
      if (meeting.status !== "ended") await endMeeting({ meetingId });
      toast.success(summaryGenerated ? "Meeting ended and summary saved" : "Meeting ended");
    } catch { toast.error("Unable to leave meeting cleanly"); }
    finally { router.push("/meetings"); }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
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
          <div className="h-full min-h-0">
            <ParticipantGrid
              localStream={localStream}
              presentationStream={presentationStream}
              remoteStreams={remoteStreams}
              participants={participants}
              localParticipantId={participantId}
            />
          </div>
        </div>

        {isSidebarOpen ? (
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
            onToggleAudio={() => void toggleAudio()}
            onToggleVideo={() => void toggleVideo()}
            onToggleScreenShare={() => void (isScreenSharing ? stopScreenShare() : startScreenShare())}
            onLeave={() => void handleLeave()}
          />
        </div>
      </div>
    </div>
  );
}
