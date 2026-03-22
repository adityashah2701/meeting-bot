"use client";

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

export function ParticipantGrid({
  localStream,
  cameraStream,
  presentationStream,
  remoteCameraStreams,
  remotePresentationStreams,
  participants,
  localParticipantId,
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
}) {
  const localParticipant = participants.find((p) => p._id === localParticipantId) ?? null;
  const screenSharer = participants.find((p) => p.isScreenSharing) ?? null;
  const thumbnailParticipants = participants.filter(
    (p) => p._id !== screenSharer?._id && p._id !== localParticipantId,
  );

  // Screen share layout
  if (screenSharer) {
    return (
      <div className="flex h-full min-h-0 gap-3">
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

        {/* Thumbnail rail */}
        <div className="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
          {localParticipant && (
            <AspectRatio ratio={16 / 9}>
              <VideoTile
                className="h-full rounded-lg"
                stream={cameraStream}
                audioStream={localStream}
                name={localParticipant.name}
                imageUrl={localParticipant.imageUrl}
                isLocal
                isMicEnabled={localParticipant.isMicEnabled}
                isCameraEnabled={localParticipant.isCameraEnabled}
                isScreenSharing={localParticipant.isScreenSharing}
              />
            </AspectRatio>
          )}
          {screenSharer && screenSharer._id !== localParticipantId && (
            <AspectRatio ratio={16 / 9}>
              <VideoTile
                className="h-full rounded-lg"
                stream={remoteCameraStreams[screenSharer._id] ?? null}
                name={screenSharer.name}
                imageUrl={screenSharer.imageUrl}
                isMicEnabled={screenSharer.isMicEnabled}
                isCameraEnabled={screenSharer.isCameraEnabled}
                isScreenSharing={screenSharer.isScreenSharing}
              />
            </AspectRatio>
          )}
          {thumbnailParticipants.map((p) => (
            <AspectRatio ratio={16 / 9} key={p._id}>
              <VideoTile
                className="h-full rounded-lg"
                stream={remoteCameraStreams[p._id] ?? null}
                name={p.name}
                imageUrl={p.imageUrl}
                isMicEnabled={p.isMicEnabled}
                isCameraEnabled={p.isCameraEnabled}
                isScreenSharing={p.isScreenSharing}
              />
            </AspectRatio>
          ))}
        </div>
      </div>
    );
  }

  const allParticipants = [
    ...(localParticipant ? [localParticipant] : []),
    ...participants.filter((p) => p._id !== localParticipantId),
  ];
  const count = allParticipants.length;
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
              />
            </AspectRatio>
          </div>
        );
      })}
    </div>
  );
}
