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
  avatarDensity = "default",
  variant = "tile",
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
  avatarDensity?: "default" | "compact" | "grid";
  /** "pip" renders the floating self-preview chrome (border, shadow, always-compact labels). */
  variant?: "tile" | "pip";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldRenderVideo = Boolean(stream && (isCameraEnabled || isPresentation));
  // Use dedicated audioStream for speaking detection when provided
  // (local tile sends audio-only stream; remote tiles carry both).
  const isSpeaking = useAudioActivity(audioStream ?? stream);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const isCompactTile = avatarDensity === "compact";
  const isGridTile = avatarDensity === "grid";
  const avatarSizeClass = isCompactTile ? "size-8" : isGridTile ? "size-10 @xs:size-12 @sm:size-16" : "size-16";
  const avatarRingClass = isCompactTile ? "p-px" : "p-1";
  const avatarFallbackTextClass = isCompactTile ? "text-[10px]" : isGridTile ? "text-xs @sm:text-base" : "text-base";
  const cameraOffBadgeClass = isCompactTile
    ? "px-1.5 py-0.5 text-[8px]"
    : isGridTile
      ? "px-1.5 py-0.5 text-[9px] @sm:px-2.5 @sm:py-1 @sm:text-xs"
      : "px-2.5 py-1 text-xs";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Keep the visual element muted. Remote audio is played via a dedicated
    // hidden audio element so autoplay retries don't permanently mute peers.
    el.muted = true;
    el.srcObject = shouldRenderVideo ? stream : null;

    if (!stream || !shouldRenderVideo) return;

    const attemptPlay = () => {
      el.play().catch(() => undefined);
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
  }, [shouldRenderVideo, stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const hasLiveRemoteAudio = Boolean(
      !isLocal
      && stream
      && stream.getAudioTracks().some((track) => track.readyState === "live"),
    );

    el.srcObject = hasLiveRemoteAudio ? stream : null;
    el.muted = false;

    if (!stream || !hasLiveRemoteAudio) {
      return;
    }

    let removeInteractionFallback: (() => void) | null = null;

    const clearInteractionFallback = () => {
      removeInteractionFallback?.();
      removeInteractionFallback = null;
    };

    const registerInteractionFallback = () => {
      if (removeInteractionFallback || typeof window === "undefined") {
        return;
      }

      const retryPlayback = () => {
        void el.play()
          .then(() => {
            clearInteractionFallback();
          })
          .catch(() => undefined);
      };

      const options = { capture: true } as AddEventListenerOptions;
      window.addEventListener("pointerdown", retryPlayback, options);
      window.addEventListener("keydown", retryPlayback, options);
      window.addEventListener("touchstart", retryPlayback, options);

      removeInteractionFallback = () => {
        window.removeEventListener("pointerdown", retryPlayback, options);
        window.removeEventListener("keydown", retryPlayback, options);
        window.removeEventListener("touchstart", retryPlayback, options);
      };
    };

    const attemptPlay = () => {
      void el.play()
        .then(() => {
          clearInteractionFallback();
        })
        .catch(() => {
          registerInteractionFallback();
        });
    };

    attemptPlay();

    const onTrackChange = () => {
      const nextHasLiveAudio = stream.getAudioTracks().some(
        (track) => track.readyState === "live",
      );
      el.srcObject = nextHasLiveAudio ? stream : null;
      if (nextHasLiveAudio) {
        attemptPlay();
      } else {
        clearInteractionFallback();
      }
    };

    stream.addEventListener("addtrack", onTrackChange);
    stream.addEventListener("removetrack", onTrackChange);

    return () => {
      clearInteractionFallback();
      stream.removeEventListener("addtrack", onTrackChange);
      stream.removeEventListener("removetrack", onTrackChange);
      el.srcObject = null;
    };
  }, [isLocal, stream]);

  const isPip = variant === "pip";

  return (
    <div
      className={cn(
        "@container relative flex h-full transition-all duration-200",
        isSpeaking &&
          "ring-2 ring-primary shadow-[0_0_28px_-6px_var(--color-primary)] ring-offset-1 ring-offset-background",
        isPip && "rounded-2xl ring-1 ring-background/80 shadow-2xl",
        className,
      )}
    >
    <div className="relative flex h-full w-full overflow-hidden bg-[#101018] shadow-lg rounded-[inherit]">
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn(
            "h-full w-full",
            isPresentation ? "object-contain" : "object-cover",
            isLocal && !isPresentation && "scale-x-[-1]",
          )}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-linear-to-br from-[#15151f] to-[#0c0c14]">
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "rounded-full transition-all duration-300",
                avatarRingClass,
                isSpeaking && "ring-2 ring-primary ring-offset-2 ring-offset-[#101018]",
              )}
            >
              <Avatar className={cn(avatarSizeClass, "shadow-md")}>
                <AvatarImage className="rounded-[100%]!" alt={name} src={imageUrl} />
                <AvatarFallback className={cn("bg-primary/20 font-semibold text-primary", avatarFallbackTextClass)}>
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            {!isPip && (
              <div className={cn("flex items-center gap-1.5 rounded-full bg-black/30 text-white/60 backdrop-blur", cameraOffBadgeClass)}>
                <VideoOff className="h-3 w-3" />
                <span>Camera off</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name and Status Pill */}
      <div className="absolute left-2 bottom-2 max-w-[calc(100%-16px)] flex items-center gap-2 rounded-lg bg-black/40 px-2 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-all group-hover:bg-black/60">
        <span className="truncate drop-shadow-sm">
          {name}
          {isLocal ? " (You)" : ""}
        </span>
        {(!isMicEnabled || isScreenSharing || isSpeaking) && (
          <div className="flex shrink-0 items-center gap-1.5 border-l border-white/20 pl-2">
            {isSpeaking && <span className="size-2 rounded-full bg-primary animate-pulse" />}
            {!isMicEnabled && <MicOff className="h-3.5 w-3.5 text-red-400 drop-shadow-sm" />}
            {isScreenSharing && <MonitorUp className="h-3.5 w-3.5 text-blue-400 drop-shadow-sm" />}
          </div>
        )}
      </div>
      <audio ref={audioRef} autoPlay hidden aria-hidden="true" />
    </div>
    </div>
  );
}
