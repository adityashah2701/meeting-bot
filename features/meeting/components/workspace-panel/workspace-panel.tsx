"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  MessageSquare,
  NotebookPen,
  Sparkles,
  Captions,
  Users,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { meetingService } from "@/features/meeting/services/meeting-service";
import type {
  TranscriptLine,
  TranscriptionMode,
} from "@/features/ai/hooks/use-transcription";
import { ChatSection } from "./chat-section";
import { AiSection } from "./ai-section";
import { TranscriptSection } from "./transcript-section";
import { NotesSection } from "./notes-section";
import { PeopleSection } from "./people-section";

export type WorkspaceSection =
  | "chat"
  | "ai"
  | "transcript"
  | "notes"
  | "people";

const RAIL_ITEMS: {
  id: WorkspaceSection;
  icon: typeof MessageSquare;
  label: string;
}[] = [
  { id: "ai", icon: Sparkles, label: "AI" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "transcript", icon: Captions, label: "Transcript" },
  { id: "notes", icon: NotebookPen, label: "Notes" },
  { id: "people", icon: Users, label: "People" },
];

/**
 * Icon-rail nav is always visible (even when the content pane is collapsed by
 * the shell's ResizablePanel), so the workspace stays "available but
 * secondary" instead of disappearing entirely.
 */
export function WorkspacePanel({
  meetingId,
  orgId,
  transcript,
  isActivelyTranscribing = false,
  transcriptionMode,
  onTranscriptionModeChange,
  activeSection,
  onActiveSectionChange,
  collapsed = false,
  onRailSelect,
}: {
  meetingId: Id<"meetings">;
  orgId: string;
  transcript: TranscriptLine[];
  isActivelyTranscribing?: boolean;
  transcriptionMode: TranscriptionMode;
  onTranscriptionModeChange: (mode: TranscriptionMode) => void;
  activeSection: WorkspaceSection;
  onActiveSectionChange: (section: WorkspaceSection) => void;
  collapsed?: boolean;
  /** Called when a rail icon is clicked while the content pane is collapsed — the shell should expand it. */
  onRailSelect?: (section: WorkspaceSection) => void;
}) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const messages =
    useQuery(
      meetingService.listMessages,
      meeting?.currentParticipant?.status === "joined" ? { meetingId } : "skip",
    ) ?? [];
  const waitingRoom =
    useQuery(
      meetingService.listWaitingRoom,
      meeting?.effectivePermissions?.canAdmitOthers ? { meetingId } : "skip",
    ) ?? [];
  const summaryAsset = useQuery(meetingService.getSummary, { meetingId });

  // "Seen" tracking is adjusted during render (React's sanctioned pattern for
  // deriving state from props without an effect) rather than via useEffect —
  // each condition only fires while its count/content is actually stale.
  const [seenChatCount, setSeenChatCount] = useState(0);
  if (activeSection === "chat" && seenChatCount !== messages.length) {
    setSeenChatCount(messages.length);
  }

  const currentSummaryContent = summaryAsset?.content ?? null;
  const [seenSummaryContent, setSeenSummaryContent] = useState<string | null>(null);
  if (activeSection === "ai" && seenSummaryContent !== currentSummaryContent) {
    setSeenSummaryContent(currentSummaryContent);
  }

  const unreadChat = Math.max(0, messages.length - seenChatCount);
  const waitingCount = waitingRoom.length;
  const aiHasUpdate = Boolean(currentSummaryContent && currentSummaryContent !== seenSummaryContent);

  const badgeFor = (section: WorkspaceSection) => {
    if (section === "chat" && unreadChat > 0)
      return unreadChat > 9 ? "9+" : String(unreadChat);
    if (section === "people" && waitingCount > 0)
      return waitingCount > 9 ? "9+" : String(waitingCount);
    if (section === "ai" && aiHasUpdate) return "dot";
    return null;
  };

  const handleSelect = (section: WorkspaceSection) => {
    if (collapsed) {
      onRailSelect?.(section);
    }
    onActiveSectionChange(section);
  };

  return (
    <div className="flex h-full min-h-0 bg-card">
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border py-3">
        {RAIL_ITEMS.map(({ id, icon: Icon, label }) => {
          const badge = badgeFor(id);
          const active = !collapsed && activeSection === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => handleSelect(id)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {badge === "dot" ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              ) : badge ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {!collapsed ? (
        <div className="min-w-0 flex-1">
          {activeSection === "chat" ? (
            <ChatSection meetingId={meetingId} />
          ) : null}
          {activeSection === "ai" ? (
            <AiSection
              meetingId={meetingId}
              orgId={orgId}
              transcript={transcript}
            />
          ) : null}
          {activeSection === "transcript" ? (
            <TranscriptSection
              transcript={transcript}
              isActivelyTranscribing={isActivelyTranscribing}
              transcriptionMode={transcriptionMode}
              onTranscriptionModeChange={onTranscriptionModeChange}
            />
          ) : null}
          {activeSection === "notes" ? (
            <NotesSection meetingId={meetingId} />
          ) : null}
          {activeSection === "people" ? (
            <PeopleSection meetingId={meetingId} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
