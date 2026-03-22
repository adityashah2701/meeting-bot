"use client";

import { useEffect, useRef } from "react";
import { MicOff, MonitorUp, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAudioActivity } from "@/features/webrtc/hooks/use-audio-activity";

export function VideoTile({
  className,
  stream,
  audioStream,
  name,
  imageUrl,
  isLocal = false,
  isMicEnabled = true,
  isCameraEnabled = true,
  isScreenSharing = false,
  isPresentation = false,
}: {
  className?: string;
  stream: MediaStream | null;
  /** Optional separate stream used only for the speaking-activity indicator.
   *  Pass the audio-only stream for the local tile so the mic LED still works
   *  when the camera stream has no audio tracks. */
  audioStream?: MediaStream | null;
  name: string;
  imageUrl?: string;
  isLocal?: boolean;
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  isScreenSharing?: boolean;
  isPresentation?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Use dedicated audioStream for speaking detection when provided
  // (local tile sends audio-only stream; remote tiles carry both).
  const isSpeaking = useAudioActivity(audioStream ?? stream);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.srcObject = stream;

    if (!stream) return;

    // Autoplay policy can block play() even with the autoplay attribute.
    // We call play() explicitly and retry muted if the browser blocks it.
    const attemptPlay = () => {
      el.play().catch(() => {
        // Autoplay was blocked — retry muted (browsers always allow muted autoplay).
        if (!el.muted) {
          el.muted = true;
          el.play().catch(() => undefined);
        }
      });
    };

    attemptPlay();

    // When tracks are added/removed from the stream (renegotiation), the
    // video element may need to restart playback.
    const onTrackChange = () => attemptPlay();
    stream.addEventListener("addtrack", onTrackChange);
    stream.addEventListener("removetrack", onTrackChange);

    return () => {
      stream.removeEventListener("addtrack", onTrackChange);
      stream.removeEventListener("removetrack", onTrackChange);
    };
  }, [stream]);

  return (
    <div
      className={cn(
        "relative flex h-full overflow-hidden bg-[#1a1a2e] shadow-lg transition-all duration-200",
        isSpeaking && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        className,
      )}
    >
      {stream && (isCameraEnabled || isPresentation || isLocal) ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={cn(
            "h-full w-full",
            isPresentation ? "object-contain" : "object-cover",
            isLocal && !isPresentation && "scale-x-[-1]",
          )}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-linear-to-br from-[#1a1a2e] to-[#16213e]">
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "rounded-full p-1 transition-all duration-300",
                isSpeaking && "ring-2 ring-primary ring-offset-2 ring-offset-[#1a1a2e]",
              )}
            >
              <Avatar className="size-16 shadow-md">
                <AvatarImage alt={name} src={imageUrl} />
                <AvatarFallback className="bg-primary/20 text-base font-semibold text-primary">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs text-white/60 backdrop-blur">
              <VideoOff className="h-3 w-3" />
              <span>Camera off</span>
            </div>
          </div>
        </div>
      )}

      {/* Name bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/80 to-transparent px-3 py-2.5 text-xs text-white">
        <span className="font-medium drop-shadow">{name}{isLocal ? " (You)" : ""}</span>
        <div className="flex items-center gap-2 opacity-80">
          {!isMicEnabled && (
            <div className="rounded-full bg-red-500/80 p-0.5">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {isScreenSharing && <MonitorUp className="h-3.5 w-3.5" />}
        </div>
      </div>
    </div>
  );
}
