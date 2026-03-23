"use client";

import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicToggle } from "@/features/webrtc/components/mic-toggle";
import { CameraToggle } from "@/features/webrtc/components/camera-toggle";
import { ScreenShareButton } from "@/features/webrtc/components/screen-share-button";
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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
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
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
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
