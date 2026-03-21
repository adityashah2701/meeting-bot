"use client";

import { cn } from "@/lib/utils";
import { VideoTile } from "@/features/webrtc/components/video-tile";

type Participant = {
  _id: string;
  name: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
};

export function ParticipantGrid({
  localStream,
  presentationStream,
  remoteStreams,
  participants,
  localParticipantId,
}: {
  localStream: MediaStream | null;
  presentationStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Participant[];
  localParticipantId: string | null;
}) {
  const participantCount = participants.length;
  const localParticipant = participants.find((participant) => participant._id === localParticipantId) ?? null;
  const screenSharer = participants.find((participant) => participant.isScreenSharing) ?? null;
  const thumbnailParticipants = participants.filter(
    (participant) =>
      participant._id !== screenSharer?._id && participant._id !== localParticipantId,
  );
  const galleryGridClassName =
    participantCount <= 2
      ? "md:grid-cols-2"
      : participantCount <= 4
        ? "md:grid-cols-2 xl:grid-cols-2"
        : participantCount <= 6
          ? "md:grid-cols-2 xl:grid-cols-3"
          : participantCount <= 9
            ? "grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

  const galleryTileClassName =
    participantCount >= 10 ? "min-h-36" : participantCount >= 7 ? "min-h-40" : "min-h-52";

  const thumbnailRailClassName =
    thumbnailParticipants.length >= 5
      ? "grid-cols-2 xl:grid-cols-2"
      : thumbnailParticipants.length >= 3
        ? "grid-cols-2 xl:grid-cols-1"
        : "grid-cols-1";

  return (
    <div className="grid h-full gap-4">
      {screenSharer ? (
        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-h-0">
            <VideoTile
              className="h-full min-h-[320px]"
              stream={
                screenSharer._id === localParticipantId
                  ? presentationStream
                  : remoteStreams[screenSharer._id] ?? null
              }
              name={screenSharer.name}
              isLocal={screenSharer._id === localParticipantId}
              isMicEnabled={screenSharer.isMicEnabled}
              isCameraEnabled={screenSharer.isCameraEnabled}
              isScreenSharing={screenSharer.isScreenSharing}
              isPresentation
            />
          </div>
          <div className="grid max-h-full gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-1">
            {localParticipant ? (
              <VideoTile
                key={localParticipant._id}
                className="min-h-36"
                stream={localStream}
                name={localParticipant.name}
                isLocal
                isMicEnabled={localParticipant.isMicEnabled}
                isCameraEnabled={localParticipant.isCameraEnabled}
                isScreenSharing={localParticipant.isScreenSharing}
              />
            ) : null}
            <div className={cn("grid gap-4", thumbnailRailClassName)}>
              {thumbnailParticipants.map((participant) => (
                <VideoTile
                  key={participant._id}
                  className="min-h-32"
                  stream={remoteStreams[participant._id] ?? null}
                  name={participant.name}
                  isMicEnabled={participant.isMicEnabled}
                  isCameraEnabled={participant.isCameraEnabled}
                  isScreenSharing={participant.isScreenSharing}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("grid h-full gap-4 overflow-y-auto pr-1", galleryGridClassName)}>
          {localParticipant && (
            <VideoTile
              className={galleryTileClassName}
              stream={localStream}
              name={localParticipant.name}
              isLocal
              isMicEnabled={localParticipant.isMicEnabled}
              isCameraEnabled={localParticipant.isCameraEnabled}
              isScreenSharing={localParticipant.isScreenSharing}
            />
          )}
          {participants
            .filter((participant) => participant._id !== localParticipantId)
            .map((participant) => (
              <VideoTile
                key={participant._id}
                className={galleryTileClassName}
                stream={remoteStreams[participant._id] ?? null}
                name={participant.name}
                isMicEnabled={participant.isMicEnabled}
                isCameraEnabled={participant.isCameraEnabled}
                isScreenSharing={participant.isScreenSharing}
              />
            ))}
        </div>
      )}
    </div>
  );
}
