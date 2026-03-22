"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { meetingService } from "@/features/meeting/services/meeting-service";

type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebrtc(meetingId: Id<"meetings">) {
  const joinMeeting = useMutation(meetingService.joinMeeting);
  const leaveMeeting = useMutation(meetingService.leaveMeeting);
  const heartbeat = useMutation(meetingService.heartbeatParticipant);
  const updateMediaState = useMutation(meetingService.updateMediaState);
  const sendSignal = useMutation(meetingService.sendSignal);
  const clearSignals = useMutation(meetingService.clearSignals);

  const [participantId, setParticipantId] = useState<Id<"meeting_participants"> | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [presentationStream, setPresentationStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const presentationStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const participantRows = useQuery(meetingService.listParticipants, { meetingId });
  const signalRows = useQuery(
    meetingService.listSignals,
    participantId ? { meetingId, participantId } : "skip",
  );
  const participants = useMemo(() => participantRows ?? [], [participantRows]);
  const signals = useMemo(() => signalRows ?? [], [signalRows]);

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  useEffect(() => {
    presentationStreamRef.current = presentationStream;
  }, [presentationStream]);

  const remoteParticipants = useMemo(
    () => participants.filter((participant) => participant._id !== participantId),
    [participantId, participants],
  );

  useEffect(() => {
    joinMeeting({ meetingId })
      .then((id) => setParticipantId(id))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to join meeting");
      });
  }, [joinMeeting, meetingId]);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      heartbeat({ meetingId }).catch(() => undefined);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [heartbeat, meetingId, participantId]);

  useEffect(() => {
    // This effect runs exactly once. The localStreamRef guard prevents re-runs
    // if React ever calls the effect again (e.g. StrictMode double-invoke).
    const setup = async () => {
      if (localStreamRef.current) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        cameraStreamRef.current = stream;
        // Default camera to off — disable video tracks immediately
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        // Sync the disabled state to the server
        void updateMediaState({
          meetingId,
          isMicEnabled: true,
          isCameraEnabled: false,
          isScreenSharing: false,
        }).catch(() => undefined);
      } catch {
        toast.error("Camera or microphone access is required");
      }
    };

    void setup();
    // Run once on mount — meetingId and updateMediaState are stable at join time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const peerConnectionsRef = peersRef;
    const remoteMediaRef = remoteStreamsRef;
    const sharedPresentationRef = presentationStreamRef;
    const activeLocalStreamRef = localStreamRef;

    return () => {
      Object.values(peerConnectionsRef.current).forEach((connection) => connection.close());
      Object.values(remoteMediaRef.current).forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      sharedPresentationRef.current?.getTracks().forEach((track) => track.stop());
      activeLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
      leaveMeeting({ meetingId }).catch(() => undefined);
    };
  }, [leaveMeeting, meetingId]);

  const syncMediaState = async (nextState?: {
    audio?: boolean;
    video?: boolean;
    screen?: boolean;
  }) => {
    await updateMediaState({
      meetingId,
      isMicEnabled: nextState?.audio ?? !isAudioMuted,
      isCameraEnabled: nextState?.video ?? !isVideoOff,
      isScreenSharing: nextState?.screen ?? isScreenSharing,
    });
  };

  const replaceOutgoingVideoTrack = async (track: MediaStreamTrack) => {
    const peers = Object.values(peersRef.current);
    await Promise.all(
      peers.map(async (connection) => {
        const sender = connection
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(track);
        }
      }),
    );
  };

  const createPeerConnection = useCallback(async (
    remoteParticipantId: string,
    shouldCreateOffer: boolean,
  ) => {
    if (peersRef.current[remoteParticipantId]) {
      return peersRef.current[remoteParticipantId];
    }

    const connection = new RTCPeerConnection(rtcConfig);
    peersRef.current[remoteParticipantId] = connection;

    localStreamRef.current?.getTracks().forEach((track) => {
      connection.addTrack(track, localStreamRef.current as MediaStream);
    });

    connection.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) {
        return;
      }

      setRemoteStreams((current) => ({
        ...current,
        [remoteParticipantId]: stream,
      }));
    };

    connection.onicecandidate = (event) => {
      if (!event.candidate || !participantId) {
        return;
      }

      sendSignal({
        meetingId,
        receiverParticipantId: remoteParticipantId as Id<"meeting_participants">,
        kind: "ice-candidate",
        payload: JSON.stringify({ candidate: event.candidate.toJSON() }),
      }).catch(() => undefined);
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed") {
        delete peersRef.current[remoteParticipantId];
      }
    };

    if (shouldCreateOffer) {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal({
        meetingId,
        receiverParticipantId: remoteParticipantId as Id<"meeting_participants">,
        kind: "offer",
        payload: JSON.stringify({ sdp: offer }),
      });
    }

    return connection;
  }, [meetingId, participantId, sendSignal]);

  useEffect(() => {
    if (!participantId || !localStreamRef.current) {
      return;
    }

    const activeParticipantIds = new Set(remoteParticipants.map((participant) => participant._id));

    remoteParticipants.forEach((participant) => {
      const shouldCreateOffer = participantId > participant._id;
      void createPeerConnection(participant._id, shouldCreateOffer);
    });

    Object.keys(peersRef.current).forEach((peerId) => {
      if (!activeParticipantIds.has(peerId as Id<"meeting_participants">)) {
        peersRef.current[peerId]?.close();
        delete peersRef.current[peerId];
        setRemoteStreams((current) => {
          const next = { ...current };
          delete next[peerId];
          return next;
        });
      }
    });
  }, [createPeerConnection, localStream, participantId, remoteParticipants]);

  useEffect(() => {
    const pendingSignals = signals.filter(
      (signal) => !processedSignalIdsRef.current.has(signal._id),
    );

    if (pendingSignals.length === 0) {
      return;
    }

    pendingSignals.forEach((signal) => {
      processedSignalIdsRef.current.add(signal._id);
    });

    void Promise.all(
      pendingSignals.map(async (signal) => {
        const payload = JSON.parse(signal.payload) as SignalPayload;
        const connection = await createPeerConnection(
          signal.senderParticipantId,
          false,
        );

        if (signal.kind === "offer" && payload.sdp) {
          await connection.setRemoteDescription(
            new RTCSessionDescription(payload.sdp),
          );
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await sendSignal({
            meetingId,
            receiverParticipantId: signal.senderParticipantId,
            kind: "answer",
            payload: JSON.stringify({ sdp: answer }),
          });
        }

        if (signal.kind === "answer" && payload.sdp) {
          await connection.setRemoteDescription(
            new RTCSessionDescription(payload.sdp),
          );
        }

        if (signal.kind === "ice-candidate" && payload.candidate) {
          await connection.addIceCandidate(
            new RTCIceCandidate(payload.candidate),
          );
        }
      }),
    )
      .then(() =>
        clearSignals({
          signalIds: pendingSignals.map((signal) => signal._id),
        }).catch(() => undefined),
      )
      .catch(() => undefined);
  }, [clearSignals, createPeerConnection, meetingId, sendSignal, signals]);

  const toggleAudio = async () => {
    const nextValue = !isAudioMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextValue;
    });
    setIsAudioMuted(nextValue);
    await syncMediaState({ audio: !nextValue });
  };

  const toggleVideo = async () => {
    const nextValue = !isVideoOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextValue;
    });
    setIsVideoOff(nextValue);
    await syncMediaState({ video: !nextValue });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const [screenTrack] = stream.getVideoTracks();
      if (!screenTrack) {
        return;
      }

      screenTrackRef.current = screenTrack;
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      await replaceOutgoingVideoTrack(screenTrack);
      setPresentationStream(stream);
      setIsScreenSharing(true);
      await syncMediaState({ screen: true, video: true });
    } catch {
      toast.error("Screen share was cancelled");
    }
  };

  const stopScreenShare = async () => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (!cameraTrack) {
      return;
    }

    await replaceOutgoingVideoTrack(cameraTrack);
    setPresentationStream(null);
    setIsScreenSharing(false);
    await syncMediaState({ screen: false, video: true });
  };

  return {
    participantId,
    localStream,
    presentationStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}
