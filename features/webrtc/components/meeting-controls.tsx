"use client";

import { PhoneOff, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function MeetingControls({
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
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/90 px-5 py-3 shadow-2xl shadow-black/30 backdrop-blur-md">
      <MicToggle muted={isAudioMuted} onClick={onToggleAudio} disabled={!canToggleAudio} />
      <CameraToggle off={isVideoOff} onClick={onToggleVideo} disabled={!canToggleVideo} />
      <ScreenShareButton
        active={isScreenSharing}
        onClick={onToggleScreenShare}
        disabled={!canShareScreen}
      />
      {canReact ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl px-3 gap-2">
              <SmilePlus className="h-4 w-4" />
              <span className="hidden sm:inline">React</span>
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
                  <span className="text-[10px] text-muted-foreground">
                    {reaction.label}
                  </span>
                </Button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <div className="mx-2 h-7 w-px bg-border" />
      {isHost ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl px-4 gap-2"
            >
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
          variant="destructive"
          size="sm"
          onClick={onLeave}
          className="rounded-xl px-4 gap-2"
        >
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      )}
    </div>
  );
}
