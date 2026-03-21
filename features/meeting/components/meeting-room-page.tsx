"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Clock3, PanelRightClose, PanelRightOpen, Radio } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/loading-block";
import { meetingService } from "@/features/meeting/services/meeting-service";
import { useTranscription, type TranscriptLine } from "@/features/ai/hooks/use-transcription";
import { useWebrtc } from "@/features/webrtc/hooks/use-webrtc";
import { ParticipantGrid } from "@/features/webrtc/components/participant-grid";
import { MeetingControls } from "@/features/webrtc/components/meeting-controls";
import { MeetingSidePanel } from "@/features/meeting/components/meeting-side-panel";

export function MeetingRoomPage({ meetingId }: { meetingId: Id<"meetings"> }) {
  const router = useRouter();
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const transcriptRows = useQuery(meetingService.listTranscripts, { meetingId });
  const addTranscript = useMutation(meetingService.addTranscript);
  const endMeeting = useMutation(meetingService.endMeeting);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptLine | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const dbTranscript = useMemo(() => transcriptRows ?? [], [transcriptRows]);

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
    }));

    return interimTranscript ? [...persisted, interimTranscript] : persisted;
  }, [dbTranscript, interimTranscript]);

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
      addTranscript({
        meetingId,
        text: line.text,
        timestamp: line.timestamp,
      }).catch(() => undefined);
    },
  });

  if (meeting === undefined) {
    return <LoadingBlock className="h-screen w-full" />;
  }

  if (!meeting) {
    return <div className="p-6 text-sm text-muted-foreground">Meeting not found.</div>;
  }

  const handleLeave = async () => {
    try {
      if (meeting.status !== "ended") {
        await endMeeting({ meetingId });
      }
      toast.success("Meeting ended");
    } catch {
      toast.error("Unable to leave meeting cleanly");
    } finally {
      router.push("/meetings");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-2 lg:px-5">
        <div className="flex gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-x-5 items-center">
            <h1 className="mt-0.5 text-lg font-semibold text-foreground lg:text-xl">{meeting.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-muted-foreground">
            <div className="flex items-center gap-2 border border-border px-2 py-1">
              <Radio className="h-3.5 w-3.5" />
              <span>{meeting.status}</span>
            </div>
            <div className="flex items-center gap-2 border border-border px-2 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {isSidebarOpen ? "Hide Panel" : "Show Panel"}
            </Button>
          </div>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 ${isSidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"}`}>
        <div className="flex min-h-0 flex-col gap-4 p-4 lg:p-6">
          <div className="min-h-0 flex-1 border border-border bg-card p-4">
            <ParticipantGrid
              localStream={localStream}
              presentationStream={presentationStream}
              remoteStreams={remoteStreams}
              participants={participants}
              localParticipantId={participantId}
            />
          </div>
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

        {isSidebarOpen ? (
          <div className="min-h-0 border-l border-border">
            <MeetingSidePanel meetingId={meetingId} transcript={transcript} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
