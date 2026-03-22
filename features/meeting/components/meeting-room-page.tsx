"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Clock3, PanelRightClose, PanelRightOpen, Radio } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/loading-block";
import {
  meetingService,
  summarizeTranscript,
  type MeetingSummaryResult,
} from "@/features/meeting/services/meeting-service";
import { useTranscription, type TranscriptLine } from "@/features/ai/hooks/use-transcription";
import { useWebrtc } from "@/features/webrtc/hooks/use-webrtc";
import { ParticipantGrid } from "@/features/webrtc/components/participant-grid";
import { MeetingControls } from "@/features/webrtc/components/meeting-controls";
import { MeetingSidePanel } from "@/features/meeting/components/meeting-side-panel";

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
  const dbTranscript = useMemo(() => transcriptRows ?? [], [transcriptRows]);
  const transcriptQueueRef = useRef<Array<{ text: string; timestamp: number }>>([]);

  const {
    participantId,
    localStream,
    presentationStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
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
    return interimTranscript ? [...withQueued, interimTranscript] : withQueued;
  }, [dbTranscript, interimTranscript, queuedTranscriptLines]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const entries = transcriptQueueRef.current;
      if (entries.length === 0) {
        return;
      }

      transcriptQueueRef.current = [];
      addTranscriptBatch({
        meetingId,
        entries,
      })
        .then(() => {
          setQueuedTranscriptLines((current) => current.slice(entries.length));
        })
        .catch(() => {
          transcriptQueueRef.current = [...entries, ...transcriptQueueRef.current];
        });
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [addTranscriptBatch, meetingId]);

  useTranscription({
    enabled: Boolean(participantId && meeting?.status !== "ended"),
    userId: participantId ?? "local",
    userName: "You",
    onTranscript: (line) => {
      if (line.isInterim) {
        setInterimTranscript(line);
        return;
      }

      setInterimTranscript(null);
      setQueuedTranscriptLines((current) => [
        ...current,
        {
          ...line,
          id: `queued-${line.timestamp}`,
        },
      ]);
      transcriptQueueRef.current.push({
        text: line.text,
        timestamp: line.timestamp,
      });
    },
  });

  if (meeting === undefined) {
    return <LoadingBlock className="h-screen w-full" />;
  }

  if (!meeting) {
    return <div className="p-6 text-sm text-muted-foreground">Meeting not found.</div>;
  }

  const buildMeetingArtifacts = async () => {
    if (!meeting?.orgId) {
      return null;
    }

    const finalTranscript = transcript
      .filter((line) => !line.isInterim)
      .map((line) => ({ sender: line.sender, text: line.text }));

    if (finalTranscript.length === 0) {
      return null;
    }

    const result: MeetingSummaryResult = await summarizeTranscript(finalTranscript);
    await saveSummary({
      meetingId,
      summary: result.summary,
    });

    if (result.actionItems.length > 0) {
      await createTasksFromSummary({
        orgId: meeting.orgId,
        meetingId,
        titles: result.actionItems,
      });
    }

    return result;
  };

  const handleLeave = async () => {
    try {
      let summaryGenerated = false;

      if (meeting.status !== "ended") {
        const artifacts = await buildMeetingArtifacts().catch(() => null);
        summaryGenerated = Boolean(artifacts);
      }

      if (meeting.status !== "ended") {
        await endMeeting({ meetingId });
      }
      toast.success(summaryGenerated ? "Meeting ended and summary saved" : "Meeting ended");
    } catch {
      toast.error("Unable to leave meeting cleanly");
    } finally {
      router.push("/meetings");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-background/95 px-4 py-2.5 lg:px-5 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-foreground lg:text-lg truncate">{meeting.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase text-primary">
              <Radio className="h-3 w-3" />
              <span>{meeting.status}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full gap-1.5 text-xs"
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {isSidebarOpen ? "Hide Panel" : "Show Panel"}
            </Button>
          </div>
        </div>
      </header>

      <div
        className={`grid min-h-0 flex-1 overflow-hidden pb-28 ${
          isSidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"
        }`}
      >
        <div className="min-h-0 overflow-hidden p-4 lg:p-6">
          <div className="h-full min-h-0 border border-border bg-card p-4">
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
            <MeetingSidePanel meetingId={meetingId} transcript={transcript} orgId={meeting.orgId} />
          </div>
        ) : null}
      </div>

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
