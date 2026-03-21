import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseWebRTCParams {
  roomId: string; // To be used for convex signaling
}

export function useWebRTC({ roomId }: UseWebRTCParams) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Store RTCPeerConnections
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get user media', err);
      // Ensure we fail gracefully (e.g., if no webcam exists)
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted((prev) => !prev);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, [localStream]);

  // Create a peer connection for a given peer ID
  const createPeerConnection = useCallback((peerId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Public STUN server fallback
      ],
    });

    peerConnections.current[peerId] = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, event.streams[0]);
          return newMap;
        });
      }
    };

    // Handle ICE candidates (placeholder for signaling server integration)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to Convex signaling server
        console.log(`[ICE] Sending candidate to ${peerId}:`, event.candidate);
      }
    };

    return pc;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      // Stop local tracks safely 
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      // Close all peer connections cleanly
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, [localStream]);

  return {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    startLocalStream,
    toggleAudio,
    toggleVideo,
    createPeerConnection, // Exported to be injected with signaling data
  };
}
