"use client";

import type { ReactNode } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { VideoTile } from "@/features/webrtc/components/video-tile";

type Participant = {
  _id: string;
  name: string;
  imageUrl?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
};

function getGridClass(count: number) {
  if (count === 1) return "grid-cols-1 place-items-center";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-3";
  return "grid-cols-4";
}

function getTileMaxWidth(count: number) {
  if (count === 1) return "max-w-3xl w-full";
  return "w-full";
}

/**
 * One shared horizontal filmstrip used any time the stage is dominated by a
 * single surface (screen share, whiteboard, a pinned focus tile) so everyone
 * else gets a low-emphasis, scannable row instead of competing for width in
 * a vertical column.
 */
function FilmstripRail({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-24 shrink-0 gap-2.5 overflow-x-auto @sm:h-28">
      {children}
    </div>
  );
}

function FilmstripTile({
  participant,
  isLocal,
  stream,
  audioStream,
}: {
  participant: Participant;
  isLocal: boolean;
  stream: MediaStream | null;
  audioStream?: MediaStream | null;
}) {
  return (
    <div className="aspect-video h-full shrink-0">
      <VideoTile
        className="h-full rounded-lg"
        stream={stream}
        audioStream={audioStream}
        name={participant.name}
        imageUrl={participant.imageUrl}
        isLocal={isLocal}
        isMicEnabled={participant.isMicEnabled}
        isCameraEnabled={participant.isCameraEnabled}
        isScreenSharing={participant.isScreenSharing}
        avatarDensity="compact"
      />
    </div>
  );
}

/**
 * Anchored self-preview for the 1:1 case only. With 3+ people on stage the
 * local tile stays inside the normal grid — floating it would eat space that
 * a real corner-of-the-room camera doesn't need to claim.
 */
function SelfPreviewPip({
  participant,
  stream,
  audioStream,
}: {
  participant: Participant;
  stream: MediaStream | null;
  audioStream?: MediaStream | null;
}) {
  return (
    <div className="absolute right-4 bottom-4 z-10 h-28 w-44 @sm:h-32 @sm:w-52">
      <VideoTile
        className="h-full"
        variant="pip"
        stream={stream}
        audioStream={audioStream}
        name={participant.name}
        imageUrl={participant.imageUrl}
        isLocal
        isMicEnabled={participant.isMicEnabled}
        isCameraEnabled={participant.isCameraEnabled}
        isScreenSharing={participant.isScreenSharing}
        avatarDensity="compact"
      />
    </div>
  );
}

export function ParticipantGrid({
  localStream,
  cameraStream,
  presentationStream,
  remoteCameraStreams,
  remotePresentationStreams,
  participants,
  localParticipantId,
  pinnedParticipantId,
  focusMode = false,
  stage,
}: {
  /** Audio-only stream from the local mic — used exclusively for the speaking indicator. */
  localStream: MediaStream | null;
  /** Persistent camera-only stream for the local tile display. */
  cameraStream: MediaStream | null;
  presentationStream: MediaStream | null;
  remoteCameraStreams: Record<string, MediaStream>;
  remotePresentationStreams: Record<string, MediaStream>;
  participants: Participant[];
  localParticipantId: string | null;
  pinnedParticipantId?: string | null;
  focusMode?: boolean;
  stage?: ReactNode;
}) {
  const localParticipant = participants.find((p) => p._id === localParticipantId) ?? null;
  const screenSharer = participants.find((p) => p.isScreenSharing) ?? null;
  const pinnedParticipant =
    pinnedParticipantId
      ? participants.find((p) => p._id === pinnedParticipantId) ?? null
      : null;
  const thumbnailParticipants = participants.filter(
    (p) => p._id !== screenSharer?._id && p._id !== localParticipantId,
  );

  // Screen share layout
  if (screenSharer) {
    return (
      <div className="@container flex h-full min-h-0 flex-col gap-3">
        {/* Main presentation area */}
        <div className="min-h-0 flex-1">
          <AspectRatio ratio={16 / 9} className="h-full max-h-full">
            <VideoTile
              className="h-full rounded-xl"
              stream={
                screenSharer._id === localParticipantId
                  ? presentationStream
                  : remotePresentationStreams[screenSharer._id] ??
                    remoteCameraStreams[screenSharer._id] ??
                    null
              }
              name={screenSharer.name}
              imageUrl={screenSharer.imageUrl}
              isLocal={screenSharer._id === localParticipantId}
              isMicEnabled={screenSharer.isMicEnabled}
              isCameraEnabled={screenSharer.isCameraEnabled}
              isScreenSharing={screenSharer.isScreenSharing}
              isPresentation
            />
          </AspectRatio>
        </div>

        <FilmstripRail>
          {localParticipant && (
            <FilmstripTile
              participant={localParticipant}
              isLocal
              stream={cameraStream}
              audioStream={localStream}
            />
          )}
          {screenSharer._id !== localParticipantId && (
            <FilmstripTile
              participant={screenSharer}
              isLocal={false}
              stream={remoteCameraStreams[screenSharer._id] ?? null}
            />
          )}
          {thumbnailParticipants.map((p) => (
            <FilmstripTile
              key={p._id}
              participant={p}
              isLocal={false}
              stream={remoteCameraStreams[p._id] ?? null}
            />
          ))}
        </FilmstripRail>
      </div>
    );
  }

  const allParticipants = [
    ...(localParticipant ? [localParticipant] : []),
    ...participants.filter((p) => p._id !== localParticipantId),
  ];

  if (stage) {
    return (
      <div className="@container flex h-full min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1">
          <AspectRatio ratio={16 / 9} className="h-full max-h-full">
            <div className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              {stage}
            </div>
          </AspectRatio>
        </div>

        <FilmstripRail>
          {allParticipants.map((p) => {
            const isLocal = p._id === localParticipantId;
            return (
              <FilmstripTile
                key={p._id}
                participant={p}
                isLocal={isLocal}
                stream={isLocal ? cameraStream : (remoteCameraStreams[p._id] ?? null)}
                audioStream={isLocal ? localStream : undefined}
              />
            );
          })}
        </FilmstripRail>
      </div>
    );
  }

  if (focusMode && pinnedParticipant) {
    const rail = allParticipants.filter((p) => p._id !== pinnedParticipant._id);
    return (
      <div className="@container flex h-full min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1">
          <AspectRatio ratio={16 / 9} className="h-full max-h-full">
            <VideoTile
              className="h-full rounded-xl"
              stream={
                pinnedParticipant._id === localParticipantId
                  ? cameraStream
                  : (remoteCameraStreams[pinnedParticipant._id] ?? null)
              }
              audioStream={pinnedParticipant._id === localParticipantId ? localStream : undefined}
              name={pinnedParticipant.name}
              imageUrl={pinnedParticipant.imageUrl}
              isLocal={pinnedParticipant._id === localParticipantId}
              isMicEnabled={pinnedParticipant.isMicEnabled}
              isCameraEnabled={pinnedParticipant.isCameraEnabled}
              isScreenSharing={pinnedParticipant.isScreenSharing}
            />
          </AspectRatio>
        </div>
        <FilmstripRail>
          {rail.map((p) => {
            const isLocal = p._id === localParticipantId;
            return (
              <FilmstripTile
                key={p._id}
                participant={p}
                isLocal={isLocal}
                stream={isLocal ? cameraStream : (remoteCameraStreams[p._id] ?? null)}
                audioStream={isLocal ? localStream : undefined}
              />
            );
          })}
        </FilmstripRail>
      </div>
    );
  }

  const count = allParticipants.length;

  // 1:1 case — dock the local tile as an anchored PiP over the other
  // participant's full-stage tile instead of a flat 50/50 split.
  if (count === 2 && localParticipant) {
    const other = allParticipants.find((p) => p._id !== localParticipantId);
    if (other) {
      return (
        <div className="@container relative flex h-full min-h-0 place-items-center">
          <div className="mx-auto h-full w-full max-w-4xl">
            <AspectRatio ratio={16 / 9} className="h-full max-h-full">
              <VideoTile
                className="h-full rounded-xl"
                stream={remoteCameraStreams[other._id] ?? null}
                name={other.name}
                imageUrl={other.imageUrl}
                isMicEnabled={other.isMicEnabled}
                isCameraEnabled={other.isCameraEnabled}
                isScreenSharing={other.isScreenSharing}
              />
            </AspectRatio>
          </div>
          <SelfPreviewPip
            participant={localParticipant}
            stream={cameraStream}
            audioStream={localStream}
          />
        </div>
      );
    }
  }

  const gridClass = getGridClass(count);

  return (
    <div className={cn("grid h-full min-h-0 place-content-center gap-3", gridClass)}>
      {allParticipants.map((p) => {
        const isLocal = p._id === localParticipantId;
        return (
          <div key={p._id} className={cn(getTileMaxWidth(count))}>
            <AspectRatio ratio={16 / 9}>
              <VideoTile
                className="h-full rounded-xl"
                stream={isLocal ? cameraStream : (remoteCameraStreams[p._id] ?? null)}
                audioStream={isLocal ? localStream : undefined}
                name={p.name}
                imageUrl={p.imageUrl}
                isLocal={isLocal}
                isMicEnabled={p.isMicEnabled}
                isCameraEnabled={p.isCameraEnabled}
                isScreenSharing={p.isScreenSharing}
                avatarDensity={count >= 3 ? "grid" : "default"}
              />
            </AspectRatio>
          </div>
        );
      })}
    </div>
  );
}
