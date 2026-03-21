'use client';

import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, isMuted = false, isLocal = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 w-full h-full flex items-center justify-center group shadow-md transition-all">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted || isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-500">
          <span className="animate-pulse font-medium tracking-wide">Connecting...</span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs backdrop-blur font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {isLocal ? 'You' : 'Participant'}
      </div>
    </div>
  );
};

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ localStream, remoteStreams }) => {
  const participantsCount = 1 + remoteStreams.size;
  
  const gridClasses = participantsCount > 2 ? 'grid-cols-2' : participantsCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className={`grid gap-4 w-full h-full ${gridClasses} auto-rows-fr`}>
      <VideoPlayer stream={localStream} isLocal />
      
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <VideoPlayer key={peerId} stream={stream} />
      ))}
    </div>
  );
};
