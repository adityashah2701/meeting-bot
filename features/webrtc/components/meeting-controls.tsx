"use client";

import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicToggle } from "@/features/webrtc/components/mic-toggle";
import { CameraToggle } from "@/features/webrtc/components/camera-toggle";
import { ScreenShareButton } from "@/features/webrtc/components/screen-share-button";

export function MeetingControls({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/90 px-5 py-3 shadow-2xl shadow-black/30 backdrop-blur-md">
      <MicToggle muted={isAudioMuted} onClick={onToggleAudio} />
      <CameraToggle off={isVideoOff} onClick={onToggleVideo} />
      <ScreenShareButton active={isScreenSharing} onClick={onToggleScreenShare} />
      <div className="mx-2 h-7 w-px bg-border" />
      <Button
        variant="destructive"
        size="sm"
        onClick={onLeave}
        className="rounded-xl px-4 gap-2"
      >
        <PhoneOff className="h-4 w-4" />
        Leave
      </Button>
    </div>
  );
}
