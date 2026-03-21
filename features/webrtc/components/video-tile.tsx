"use client";

import { useEffect, useRef } from "react";
import { MicOff, MonitorUp, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioActivity } from "@/features/webrtc/hooks/use-audio-activity";

export function VideoTile({
  className,
  stream,
  name,
  isLocal = false,
  isMicEnabled = true,
  isCameraEnabled = true,
  isScreenSharing = false,
  isPresentation = false,
}: {
  className?: string;
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  isScreenSharing?: boolean;
  isPresentation?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSpeaking = useAudioActivity(stream);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative flex min-h-52 overflow-hidden border border-border bg-zinc-950",
        isSpeaking && "ring-2 ring-white/50",
        className,
      )}
    >
      {stream && isCameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={cn(
            "h-full w-full bg-black",
            isPresentation ? "object-contain" : "object-cover",
            isLocal && !isPresentation && "scale-x-[-1]",
          )}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-zinc-900 text-sm text-zinc-300">
          <div className="flex flex-col items-center gap-2">
            <VideoOff className="h-6 w-6" />
            <span>Camera unavailable</span>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/70 px-3 py-2 text-xs text-white">
        <span>{name}{isLocal ? " (You)" : ""}</span>
        <div className="flex items-center gap-2">
          {!isMicEnabled && <MicOff className="h-3.5 w-3.5" />}
          {isScreenSharing && <MonitorUp className="h-3.5 w-3.5" />}
        </div>
      </div>
    </div>
  );
}
