"use client";

import { useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { VideoTile } from "@/features/webrtc/components/video-tile";
import { useAdaptiveGrid } from "@/features/webrtc/hooks/use-adaptive-grid";

type Participant = {
  _id: string;
  name: string;
  imageUrl?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
};

function FilmstripRail({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row lg:flex-col h-20 w-full lg:h-full lg:w-56 shrink-0 gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-1 lg:pb-0 pr-1 scrollbar-hide">
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
    <motion.div layout className="aspect-video h-full w-auto lg:h-auto lg:w-full shrink-0">
      <VideoTile
        className="h-full rounded-xl shadow-md border border-white/10"
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
    </motion.div>
  );
}

function DraggableSelfPreview({
  participant,
  stream,
  audioStream,
}: {
  participant: Participant;
  stream: MediaStream | null;
  audioStream?: MediaStream | null;
}) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      className="absolute z-50 h-32 w-56 cursor-grab active:cursor-grabbing rounded-2xl shadow-2xl ring-1 ring-white/10"
      initial={{ bottom: 24, right: 24 }}
      style={{ bottom: 24, right: 24 }}
    >
      <VideoTile
        className="h-full w-full rounded-2xl"
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
    </motion.div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const localParticipant = participants.find((p) => p._id === localParticipantId) ?? null;
  const screenSharer = participants.find((p) => p.isScreenSharing) ?? null;
  const pinnedParticipant =
    pinnedParticipantId
      ? participants.find((p) => p._id === pinnedParticipantId) ?? null
      : null;
      
  const remoteParticipants = participants.filter((p) => p._id !== localParticipantId);
  const thumbnailParticipants = participants.filter(
    (p) => p._id !== screenSharer?._id && p._id !== localParticipantId,
  );

  const hasFocusElement = Boolean(screenSharer || stage || (focusMode && pinnedParticipant));

  // --- ADAPTIVE GRID LAYOUT CALCULATION (Must be above early returns) ---
  const isAlone = remoteParticipants.length === 0;
  const gridParticipants = isAlone ? participants : remoteParticipants;
  const showSelfPip = !isAlone && localParticipant;

  const { columns, tileWidth, tileHeight, gridWidth, gridHeight } = useAdaptiveGrid(containerRef, {
    participantCount: gridParticipants.length,
    targetRatio: 16 / 9,
    gap: 16,
  });

  // --- FOCUS LAYOUT (Screen Share, Whiteboard, or Pinned) ---
  if (hasFocusElement) {
    const allParticipants = [
      ...(localParticipant ? [localParticipant] : []),
      ...remoteParticipants,
    ];
    
    // Determine the focus stream
    let focusContent: ReactNode = stage;
    if (!stage && screenSharer) {
      focusContent = (
        <VideoTile
          className="h-full w-full rounded-2xl"
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
      );
    } else if (!stage && focusMode && pinnedParticipant) {
      focusContent = (
        <VideoTile
          className="h-full w-full rounded-2xl"
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
      );
    }

    const railParticipants = focusMode && pinnedParticipant
      ? allParticipants.filter((p) => p._id !== pinnedParticipant._id)
      : screenSharer 
        ? [
            ...(localParticipant ? [localParticipant] : []),
            ...(screenSharer._id !== localParticipantId ? [screenSharer] : []),
            ...thumbnailParticipants
          ]
        : allParticipants;

    return (
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col lg:flex-row gap-2 lg:gap-4 p-2 lg:p-4">
        {/* Main Focus Area */}
        <div className="min-h-0 min-w-0 flex-1">
          <div className="h-full w-full overflow-hidden rounded-xl shadow-xl bg-black/80 ring-1 ring-white/5">
            {focusContent}
          </div>
        </div>
        {/* Filmstrip */}
        {railParticipants.length > 0 && (
          <FilmstripRail>
            {railParticipants.map((p) => (
              <FilmstripTile
                key={p._id}
                participant={p}
                isLocal={p._id === localParticipantId}
                stream={p._id === localParticipantId ? cameraStream : (remoteCameraStreams[p._id] ?? null)}
                audioStream={p._id === localParticipantId ? localStream : undefined}
              />
            ))}
          </FilmstripRail>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden p-4 flex items-center justify-center">
      {/* Dynamic Grid */}
      <motion.div 
        layout
        className="grid place-content-center"
        style={{
          width: gridWidth,
          height: gridHeight,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 16,
        }}
      >
        {gridParticipants.map((p) => {
          const isLocal = p._id === localParticipantId;
          return (
            <motion.div
              layout
              key={p._id}
              style={{ width: tileWidth, height: tileHeight }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            >
              <VideoTile
                className="h-full w-full rounded-2xl shadow-lg ring-1 ring-white/10"
                stream={isLocal ? cameraStream : (remoteCameraStreams[p._id] ?? null)}
                audioStream={isLocal ? localStream : undefined}
                name={p.name}
                imageUrl={p.imageUrl}
                isLocal={isLocal}
                isMicEnabled={p.isMicEnabled}
                isCameraEnabled={p.isCameraEnabled}
                isScreenSharing={p.isScreenSharing}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Floating PIP for Self */}
      {showSelfPip && (
        <DraggableSelfPreview
          participant={localParticipant}
          stream={cameraStream}
          audioStream={localStream}
        />
      )}
    </div>
  );
}
