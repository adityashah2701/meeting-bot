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
    <div className="flex flex-wrap items-center justify-center gap-3 border border-border bg-card p-3">
      <MicToggle muted={isAudioMuted} onClick={onToggleAudio} />
      <CameraToggle off={isVideoOff} onClick={onToggleVideo} />
      <ScreenShareButton active={isScreenSharing} onClick={onToggleScreenShare} />
      <Button variant="destructive" size="lg" onClick={onLeave} className="px-4">
        <PhoneOff className="h-4 w-4" />
        Leave
      </Button>
    </div>
  );
}
