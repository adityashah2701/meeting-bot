"use client";

import { useCallback, useState, type ReactNode, type RefObject } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { RoomTopBar, type RoomAiStatus } from "@/features/meeting/components/room-top-bar";
import { SystemBanner } from "@/features/meeting/components/system-banner";
import { LiveCaptionStrip } from "@/features/meeting/components/live-caption-strip";
import {
  WorkspacePanel,
  type WorkspaceSection,
} from "@/features/meeting/components/workspace-panel/workspace-panel";
import type { TranscriptLine, TranscriptionMode } from "@/features/ai/hooks/use-transcription";

type StageBanner = "waiting" | "removed" | "rejected";



/**
 * The four-zone app shell: slim top bar, always-dominant stage, resizable
 * workspace panel, and a floating command bar + caption strip anchored to the
 * stage. `stage` and `commandBar` are opaque slots — this component owns
 * layout/chrome only, not call-control or webrtc wiring.
 */
export function RoomShell({
  captureRootRef,
  title,
  isLive,
  startedAt,
  topBarParticipants,
  aiStatus,
  isSidebarOpen,
  onToggleSidebar,
  lockedBanner = false,
  blockedBanner = false,
  onRefreshPermissions,
  stageBanner = null,
  onStageBannerAction,
  stage,
  captionLine,
  meetingId,
  orgId,
  transcript,
  isActivelyTranscribing = false,
  transcriptionMode,
  onTranscriptionModeChange,
  commandBar,
}: {
  captureRootRef: RefObject<HTMLDivElement | null>;
  title: string;
  isLive: boolean;
  startedAt?: number | null;
  topBarParticipants: Array<{ _id: string; name: string; imageUrl?: string }>;
  aiStatus: RoomAiStatus;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  lockedBanner?: boolean;
  blockedBanner?: boolean;
  onRefreshPermissions?: () => void;
  stageBanner?: StageBanner | null;
  onStageBannerAction?: () => void;
  stage: ReactNode;
  captionLine: { id: string; sender: string; text: string } | null;
  meetingId: Id<"meetings">;
  orgId: string;
  transcript: TranscriptLine[];
  isActivelyTranscribing?: boolean;
  transcriptionMode: TranscriptionMode;
  onTranscriptionModeChange: (mode: TranscriptionMode) => void;
  commandBar: ReactNode;
}) {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("chat");

  const expandAndFocus = useCallback(
    (section: WorkspaceSection) => {
      setActiveSection(section);
      if (!isSidebarOpen) onToggleSidebar();
    },
    [isSidebarOpen, onToggleSidebar],
  );

  const collapsed = !isSidebarOpen;

  const stageArea = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-3 lg:p-5">
      {stageBanner === null && (lockedBanner || blockedBanner) ? (
        <div className="mb-3 flex flex-col gap-2">
          {lockedBanner ? <SystemBanner variant="locked" /> : null}
          {blockedBanner ? <SystemBanner variant="blocked" onAction={onRefreshPermissions} /> : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {stageBanner ? <SystemBanner variant={stageBanner} onAction={onStageBannerAction} /> : stage}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-3 px-4">
        <LiveCaptionStrip line={captionLine} onExpand={() => expandAndFocus("transcript")} />
        <div className="pointer-events-auto">{commandBar}</div>
      </div>
    </div>
  );

  return (
    <div ref={captureRootRef} className="flex h-screen flex-col overflow-hidden bg-background">
      <RoomTopBar
        title={title}
        isLive={isLive}
        startedAt={startedAt}
        participants={topBarParticipants}
        aiStatus={aiStatus}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 transition-all duration-300 ease-in-out">
          {stageArea}
        </div>
        
        <div
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out border-l border-border",
            isSidebarOpen ? "w-[350px] lg:w-[400px]" : "w-14"
          )}
        >
          <WorkspacePanel
            meetingId={meetingId}
            orgId={orgId}
            transcript={transcript}
            isActivelyTranscribing={isActivelyTranscribing}
            transcriptionMode={transcriptionMode}
            onTranscriptionModeChange={onTranscriptionModeChange}
            activeSection={activeSection}
            onActiveSectionChange={setActiveSection}
            collapsed={collapsed}
            onRailSelect={(section) => expandAndFocus(section)}
          />
        </div>
      </div>
    </div>
  );
}
