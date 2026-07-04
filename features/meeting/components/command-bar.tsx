"use client";

import type { ReactNode } from "react";
import { CircleDot, PhoneOff, SmilePlus, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MicToggle } from "@/features/webrtc/components/mic-toggle";
import { CameraToggle } from "@/features/webrtc/components/camera-toggle";
import { ScreenShareButton } from "@/features/webrtc/components/screen-share-button";
import { MEETING_REACTION_OPTIONS, type MeetingReactionEmoji } from "@/features/meeting/lib/reactions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Divider() {
  return <div className="mx-1 h-7 w-px shrink-0 bg-border" />;
}

function RecordToggle({
  active,
  disabled,
  locked,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl",
        active && "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
      )}
      title={
        locked
          ? "Recordings are available on paid workspace plans"
          : active
            ? "Stop recording"
            : "Start recording"
      }
    >
      {active ? <StopCircle className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
      {active && (
        <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
        </span>
      )}
    </Button>
  );
}

/**
 * Floating bottom toolbar, reorganized into three clusters instead of one
 * flat row: primary call state (mic/camera/share/record), secondary and
 * occasional (react, the "more" popover), and destructive (leave/end) held
 * apart by its own divider so it reads as distinct without dominating.
 */
export function CommandBar({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isHost,
  canToggleAudio = true,
  canToggleVideo = true,
  canShareScreen = true,
  canReact = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSendReaction,
  onLeave,
  onEndMeeting,
  showRecordToggle = false,
  isRecordingActive = false,
  isRecordingDisabled = false,
  recordingLockedByPlan = false,
  onToggleRecording,
  moreMenu,
}: {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost?: boolean;
  canToggleAudio?: boolean;
  canToggleVideo?: boolean;
  canShareScreen?: boolean;
  canReact?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onSendReaction?: (emoji: MeetingReactionEmoji) => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
  showRecordToggle?: boolean;
  isRecordingActive?: boolean;
  isRecordingDisabled?: boolean;
  recordingLockedByPlan?: boolean;
  onToggleRecording?: () => void;
  /** Rendered as the last item of the secondary cluster — see `more-menu.tsx`. */
  moreMenu?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-background/90 px-3 py-2.5 shadow-2xl shadow-black/30 backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <MicToggle muted={isAudioMuted} onClick={onToggleAudio} disabled={!canToggleAudio} />
        <CameraToggle off={isVideoOff} onClick={onToggleVideo} disabled={!canToggleVideo} />
        <ScreenShareButton
          active={isScreenSharing}
          onClick={onToggleScreenShare}
          disabled={!canShareScreen}
        />
        {showRecordToggle && onToggleRecording && (
          <RecordToggle
            active={isRecordingActive}
            disabled={isRecordingDisabled || recordingLockedByPlan}
            locked={recordingLockedByPlan}
            onClick={onToggleRecording}
          />
        )}
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        {canReact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-lg" className="rounded-xl" title="React">
                <SmilePlus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-60 p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Send reaction
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MEETING_REACTION_OPTIONS.map((reaction) => (
                  <Button
                    key={reaction.emoji}
                    type="button"
                    variant="ghost"
                    className="h-12 flex-col gap-1 rounded-xl border border-border/50 bg-card px-2 py-2 hover:bg-muted"
                    onClick={() => onSendReaction?.(reaction.emoji)}
                  >
                    <span className="text-xl leading-none">{reaction.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{reaction.label}</span>
                  </Button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {moreMenu}
      </div>

      <Divider />

      {isHost ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl border-destructive/30 px-4 text-destructive hover:bg-destructive/10">
              <PhoneOff className="h-4 w-4" />
              Leave
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onLeave}>Leave Meeting</DropdownMenuItem>
            <DropdownMenuItem
              onClick={onEndMeeting}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              End Meeting for All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onLeave}
          className="gap-2 rounded-xl border-destructive/30 px-4 text-destructive hover:bg-destructive/10"
        >
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      )}
    </div>
  );
}
