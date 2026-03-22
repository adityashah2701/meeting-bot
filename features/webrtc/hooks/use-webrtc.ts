"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { meetingService } from "@/features/meeting/services/meeting-service";
import {
  acquireCameraStream,
  createToggleToken,
  replaceOutgoingVideoTrack,
  stopAllVideoTracks,
} from "@/features/webrtc/services/camera-track-manager";

const LOG_TAG = "[WebRTC]";

type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  candidates?: RTCIceCandidateInit[];
};

const ICE_BATCH_FLUSH_MS = 250;

function buildRtcConfig(): RTCConfiguration {
  const stunUrls =
    process.env.NEXT_PUBLIC_STUN_URLS
      ?.split(",")
      .map((url) => url.trim())
      .filter(Boolean) ?? ["stun:stun.l.google.com:19302"];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD?.trim();

  const iceServers: RTCIceServer[] = [{ urls: stunUrls }];
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: [turnUrl],
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

function isPeerConnectionClosed(connection: RTCPeerConnection) {
  return connection.signalingState === "closed" || connection.connectionState === "closed";
}

// ─── Early ICE candidate buffer ───────────────────────────────────────────────
// ICE candidates can arrive via signaling before we have set the remote
// description on the RTCPeerConnection. Applying them in that state throws.
// We buffer them per-peer and drain after setRemoteDescription succeeds.
type EarlyIceBuffer = Record<string, RTCIceCandidateInit[]>;

export function useWebrtc(meetingId: Id<"meetings">) {
  const joinMeeting = useMutation(meetingService.joinMeeting);
  const leaveMeeting = useMutation(meetingService.leaveMeeting);
  const heartbeat = useMutation(meetingService.heartbeatParticipant);
  const updateMediaState = useMutation(meetingService.updateMediaState);
  const sendSignal = useMutation(meetingService.sendSignal);
  const clearSignals = useMutation(meetingService.clearSignals);

  const [participantId, setParticipantId] = useState<Id<"meeting_participants"> | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  // cameraStream is the reactive state version of cameraStreamRef, used by
  // the local VideoTile to display the camera feed. localStream is audio-only
  // and is used by the transcription hook.
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [presentationStream, setPresentationStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  // localStreamRef holds the audio-only stream used for mic capture.
  // It is separate from cameraStreamRef so that toggling the camera does
  // not interrupt microphone capture or require re-negotiation of audio.
  const localStreamRef = useRef<MediaStream | null>(null);
  // cameraStreamRef holds the camera-only stream currently active.
  // It is null when the camera is off, meaning no hardware lock is held.
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const presentationStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  // Buffer for ICE candidates that arrived before setRemoteDescription.
  const earlyIceBufferRef = useRef<EarlyIceBuffer>({});
  // Debounce rapid camera toggling. Each toggle call stores a fresh symbol;
  // async continuations check whether their token is still current before
  // applying side-effects, discarding stale calls.
  const cameraToggleTokenRef = useRef<symbol>(createToggleToken());

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
    if (!participantId) {
      return;
    }

    const flushCandidates = () => {
      const pending = pendingIceCandidatesRef.current;
      pendingIceCandidatesRef.current = {};

      Object.entries(pending).forEach(([remoteParticipantId, candidates]) => {
        if (candidates.length === 0) {
          return;
        }

        console.debug(
          `${LOG_TAG} Flushing ${candidates.length} ICE candidates to peer=${remoteParticipantId}`,
        );

        void sendSignal({
          meetingId,
          receiverParticipantId: remoteParticipantId as Id<"meeting_participants">,
          kind: "ice-candidate",
          payload: JSON.stringify({ candidates }),
        }).catch(() => undefined);
      });
    };

    const intervalId = window.setInterval(flushCandidates, ICE_BATCH_FLUSH_MS);
    return () => {
      window.clearInterval(intervalId);
      flushCandidates();
    };
  }, [meetingId, participantId, sendSignal]);

  useEffect(() => {
    // ── ONE-TIME MEDIA SETUP ──────────────────────────────────────────────
    // We acquire AUDIO ONLY here. The camera starts OFF so the hardware LED
    // is never lit until the user explicitly enables video. This avoids the
    // privacy issue where the camera LED stays on even with "camera off".
    //
    // When the user turns the camera on, toggleVideo() calls getUserMedia for
    // video-only and attaches the resulting track to the peer connections.
    const setup = async () => {
      if (localStreamRef.current) {
        // Guard against React StrictMode double-invoke.
        return;
      }

      // Pre-flight: check mic permission before prompting, so we can show a
      // clear error message rather than a confusing empty prompt.
      try {
        if (navigator.permissions) {
          const micPerm = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (micPerm.state === "denied") {
            setPermissionDenied(true);
            toast.error(
              "Microphone access is blocked. Open browser site settings and allow microphone, then refresh.",
              { duration: 10000 },
            );
            return;
          }
        }
      } catch {
        // Permissions API not available — fall through and let getUserMedia prompt.
      }

      try {
        // Request audio-only. Camera is NOT acquired here.
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        console.debug(
          `${LOG_TAG} Audio stream acquired — id=${audioStream.id} tracks=${audioStream.getTracks().length}`,
        );

        setPermissionDenied(false);
        localStreamRef.current = audioStream;
        // Expose the audio-only stream so the transcription hook can attach
        // its AudioContext analyser to the microphone track.
        setLocalStream(audioStream);

        // Camera starts off — no video track acquired, no LED lit.
        void updateMediaState({
          meetingId,
          isMicEnabled: true,
          isCameraEnabled: false,
          isScreenSharing: false,
        }).catch(() => undefined);
      } catch (err) {
        const isDenied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
        if (isDenied) {
          setPermissionDenied(true);
          toast.error(
            "Microphone access denied. Allow mic permissions in your browser's site settings and refresh.",
            { duration: 10000 },
          );
        } else {
          toast.error("Microphone access is required to join the meeting");
        }
      }
    };

    void setup();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const peerConnectionsRef = peersRef;
    const remoteMediaRef = remoteStreamsRef;
    const sharedPresentationRef = presentationStreamRef;
    const activeLocalStreamRef = localStreamRef; // audio-only stream
    const activeCameraStreamRef = cameraStreamRef; // camera stream (may be null)

    return () => {
      // Close all peer connections first so they stop requesting frames.
      Object.values(peerConnectionsRef.current).forEach((connection) => connection.close());
      // Stop all remote streams.
      Object.values(remoteMediaRef.current).forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      // Stop screen share track.
      sharedPresentationRef.current?.getTracks().forEach((track) => track.stop());
      // Stop the audio-only local stream.
      activeLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
      // Stop the camera stream separately — this is the critical call that
      // turns the camera LED off if the user leaves while the camera is on.
      stopAllVideoTracks(activeCameraStreamRef.current);
      activeCameraStreamRef.current = null;

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

  // ─── Helper: drain early ICE buffer after remote description is set ───
  const drainEarlyIceCandidates = useCallback(
    async (connection: RTCPeerConnection, remoteParticipantId: string) => {
      const buffered = earlyIceBufferRef.current[remoteParticipantId];
      if (!buffered || buffered.length === 0) return;

      console.debug(
        `${LOG_TAG} Draining ${buffered.length} early ICE candidates for peer=${remoteParticipantId}`,
      );
      delete earlyIceBufferRef.current[remoteParticipantId];

      for (const candidate of buffered) {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(
            `${LOG_TAG} Failed to add buffered ICE candidate for peer=${remoteParticipantId}:`,
            err,
          );
        }
      }
    },
    [],
  );

  const shouldSkipPeerOperation = useCallback(
    (
      remoteParticipantId: string,
      connection: RTCPeerConnection,
      operation: string,
    ) => {
      const isCurrentConnection = peersRef.current[remoteParticipantId] === connection;
      const isClosed = isPeerConnectionClosed(connection);

      if (isCurrentConnection && !isClosed) {
        return false;
      }

      console.debug(
        `${LOG_TAG} Skipping ${operation} for peer=${remoteParticipantId} current=${isCurrentConnection} signalingState=${connection.signalingState} connectionState=${connection.connectionState}`,
      );
      return true;
    },
    [],
  );

  const createPeerConnection = useCallback(async (
    remoteParticipantId: string,
    shouldCreateOffer: boolean,
  ) => {
    const existingConnection = peersRef.current[remoteParticipantId];
    if (existingConnection) {
      if (!isPeerConnectionClosed(existingConnection)) {
        return existingConnection;
      }

      delete peersRef.current[remoteParticipantId];
    }

    console.debug(
      `${LOG_TAG} Creating peer connection for peer=${remoteParticipantId} shouldCreateOffer=${shouldCreateOffer}`,
    );

    const connection = new RTCPeerConnection(buildRtcConfig());
    peersRef.current[remoteParticipantId] = connection;

    // ── Add audio tracks from the audio-only stream ─────────────────────
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      console.debug(
        `${LOG_TAG} Adding audio track id=${track.id} to peer=${remoteParticipantId}`,
      );
      connection.addTrack(track, localStreamRef.current as MediaStream);
    });

    // ── CRITICAL FIX: Always add a video transceiver ────────────────────
    // Camera starts OFF, so there is no video track to addTrack() with.
    // Without a transceiver, there is no video m-line in the SDP, meaning:
    //   1. replaceTrack() later has no sender to target
    //   2. The remote peer never gets a video track in ontrack
    //
    // We use addTransceiver("video", { direction: "sendrecv" }) to ensure
    // a video m-line is always present. When the camera turns on, we use
    // replaceTrack() on this sender — no renegotiation needed.
    //
    // If the camera IS already on, we set the track on the transceiver's
    // sender immediately so the remote peer gets video right away.
    const currentVideoTrack = cameraStreamRef.current?.getVideoTracks()[0];
    const transceiver = connection.addTransceiver("video", {
      direction: "sendrecv",
      streams: currentVideoTrack && cameraStreamRef.current
        ? [cameraStreamRef.current]
        : undefined,
    });

    if (currentVideoTrack && currentVideoTrack.readyState === "live") {
      console.debug(
        `${LOG_TAG} Setting existing video track on transceiver for peer=${remoteParticipantId}`,
      );
      await transceiver.sender.replaceTrack(currentVideoTrack);
    }

    // ── ontrack: Receive remote streams ─────────────────────────────────
    connection.ontrack = (event) => {
      console.debug(
        `${LOG_TAG} ontrack fired — peer=${remoteParticipantId} kind=${event.track.kind} track.id=${event.track.id} streams=${event.streams.length}`,
      );

      // CRITICAL FIX: Some browsers (especially with transceivers) fire
      // ontrack without any streams. In that case, we create a synthetic
      // MediaStream from the track so the video element has something to
      // bind to.
      const stream = event.streams[0] ?? new MediaStream([event.track]);

      setRemoteStreams((current) => ({
        ...current,
        [remoteParticipantId]: stream,
      }));

      // If the remote track ends (e.g. peer leaves or stops sharing),
      // update the stream state so the UI reflects it.
      event.track.onended = () => {
        console.debug(
          `${LOG_TAG} Remote track ended — peer=${remoteParticipantId} kind=${event.track.kind}`,
        );
      };

      // When tracks are added/removed from the stream (e.g. renegotiation),
      // force a state update so React re-renders with the latest stream.
      const forceStreamUpdate = () => {
        setRemoteStreams((current) => ({
          ...current,
          [remoteParticipantId]: stream,
        }));
      };
      stream.onaddtrack = forceStreamUpdate;
      stream.onremovetrack = forceStreamUpdate;
    };

    // ── ICE candidate gathering ─────────────────────────────────────────
    connection.onicecandidate = (event) => {
      if (!event.candidate || !participantId) {
        return;
      }

      if (!pendingIceCandidatesRef.current[remoteParticipantId]) {
        pendingIceCandidatesRef.current[remoteParticipantId] = [];
      }
      pendingIceCandidatesRef.current[remoteParticipantId].push(
        event.candidate.toJSON(),
      );
    };

    // ── Connection state monitoring ─────────────────────────────────────
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      console.debug(
        `${LOG_TAG} Connection state changed — peer=${remoteParticipantId} state=${state}`,
      );

      if (state === "failed") {
        console.warn(
          `${LOG_TAG} Connection FAILED for peer=${remoteParticipantId} — restarting ICE`,
        );
        connection.restartIce();
        toast.error("Connection issue detected, retrying media path");
      }
      if (state === "disconnected") {
        toast.message("Participant connection lost. Attempting recovery…");
      }
    };

    connection.oniceconnectionstatechange = () => {
      console.debug(
        `${LOG_TAG} ICE connection state — peer=${remoteParticipantId} state=${connection.iceConnectionState}`,
      );
    };

    connection.onsignalingstatechange = () => {
      console.debug(
        `${LOG_TAG} Signaling state — peer=${remoteParticipantId} state=${connection.signalingState}`,
      );
    };

    // NOTE: We intentionally do NOT set onnegotiationneeded here.
    // addTransceiver() fires negotiationneeded synchronously, which races
    // with our explicit offer/answer flow and causes "Called in wrong state:
    // stable" errors. Since we use addTransceiver upfront + replaceTrack
    // for all track changes, renegotiation is never needed.

    // ── Create offer if we are the deterministic offerer ─────────────────
    if (shouldCreateOffer) {
      console.debug(
        `${LOG_TAG} Creating initial offer for peer=${remoteParticipantId}`,
      );
      if (shouldSkipPeerOperation(remoteParticipantId, connection, "initial offer")) {
        return connection;
      }

      const offer = await connection.createOffer();
      if (shouldSkipPeerOperation(remoteParticipantId, connection, "setLocalDescription(offer)")) {
        return connection;
      }

      await connection.setLocalDescription(offer);
      if (shouldSkipPeerOperation(remoteParticipantId, connection, "send offer")) {
        return connection;
      }

      await sendSignal({
        meetingId,
        receiverParticipantId: remoteParticipantId as Id<"meeting_participants">,
        kind: "offer",
        payload: JSON.stringify({ sdp: offer }),
      });
    }

    return connection;
  }, [meetingId, participantId, sendSignal, shouldSkipPeerOperation]);

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
        // Clean up early ICE buffer for departed peers.
        delete earlyIceBufferRef.current[peerId];
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

        if (shouldSkipPeerOperation(signal.senderParticipantId, connection, `signal ${signal.kind}`)) {
          return;
        }

        if (signal.kind === "offer" && payload.sdp) {
          console.debug(
            `${LOG_TAG} Received OFFER from peer=${signal.senderParticipantId} signalingState=${connection.signalingState}`,
          );

          // ── Perfect Negotiation: polite/impolite peer pattern ──────
          // The "polite" peer (lower participantId) always yields on a
          // collision. The "impolite" peer (higher ID) ignores the
          // incoming offer if it collides with its own.
          const isPolite = Boolean(
            participantId && participantId < signal.senderParticipantId,
          );
          const offerCollision =
            connection.signalingState !== "stable";

          if (!isPolite && offerCollision) {
            console.debug(
              `${LOG_TAG} Impolite peer ignoring colliding offer from peer=${signal.senderParticipantId}`,
            );
            return;
          }

          // Polite peer yields: rollback its own offer if any.
          if (offerCollision) {
            console.debug(
              `${LOG_TAG} Polite peer rolling back for peer=${signal.senderParticipantId}`,
            );
            if (
              shouldSkipPeerOperation(
                signal.senderParticipantId,
                connection,
                "setLocalDescription(rollback)",
              )
            ) {
              return;
            }

            await connection.setLocalDescription({ type: "rollback" });
          }

          if (
            shouldSkipPeerOperation(
              signal.senderParticipantId,
              connection,
              "setRemoteDescription(offer)",
            )
          ) {
            return;
          }

          await connection.setRemoteDescription(
            new RTCSessionDescription(payload.sdp),
          );

          // Drain any ICE candidates that arrived before remote description.
          await drainEarlyIceCandidates(connection, signal.senderParticipantId);

          // Guard: only create and set the answer if we're still in the
          // correct signaling state (have-remote-offer).
          if (connection.signalingState === "have-remote-offer") {
            if (shouldSkipPeerOperation(signal.senderParticipantId, connection, "createAnswer")) {
              return;
            }

            const answer = await connection.createAnswer();
            if (
              shouldSkipPeerOperation(
                signal.senderParticipantId,
                connection,
                "setLocalDescription(answer)",
              )
            ) {
              return;
            }

            await connection.setLocalDescription(answer);
            console.debug(
              `${LOG_TAG} Sending ANSWER to peer=${signal.senderParticipantId}`,
            );
            await sendSignal({
              meetingId,
              receiverParticipantId: signal.senderParticipantId,
              kind: "answer",
              payload: JSON.stringify({ sdp: answer }),
            });
          } else {
            console.warn(
              `${LOG_TAG} Skipping answer — unexpected signalingState=${connection.signalingState} for peer=${signal.senderParticipantId}`,
            );
          }
        }

        if (signal.kind === "answer" && payload.sdp) {
          console.debug(
            `${LOG_TAG} Received ANSWER from peer=${signal.senderParticipantId}`,
          );

          // Only apply answer if we're in the right signaling state
          if (connection.signalingState === "have-local-offer") {
            if (
              shouldSkipPeerOperation(
                signal.senderParticipantId,
                connection,
                "setRemoteDescription(answer)",
              )
            ) {
              return;
            }

            await connection.setRemoteDescription(
              new RTCSessionDescription(payload.sdp),
            );

            // CRITICAL FIX: Drain any ICE candidates that arrived before
            // the remote description was set.
            await drainEarlyIceCandidates(connection, signal.senderParticipantId);
          } else {
            console.warn(
              `${LOG_TAG} Ignoring answer — signalingState=${connection.signalingState} for peer=${signal.senderParticipantId}`,
            );
          }
        }

        if (signal.kind === "ice-candidate") {

          // Buffer ICE candidates if remote description hasn't been set yet.
          // This prevents the common "Cannot add ICE candidate when there is
          // no remote SDP" error.
          const hasRemoteDescription = connection.remoteDescription !== null;

          if (payload.candidate) {
            if (hasRemoteDescription) {
              try {
                await connection.addIceCandidate(
                  new RTCIceCandidate(payload.candidate),
                );
              } catch (err) {
                console.warn(
                  `${LOG_TAG} Failed to add ICE candidate for peer=${signal.senderParticipantId}:`,
                  err,
                );
              }
            } else {
              console.debug(
                `${LOG_TAG} Buffering early ICE candidate for peer=${signal.senderParticipantId}`,
              );
              if (!earlyIceBufferRef.current[signal.senderParticipantId]) {
                earlyIceBufferRef.current[signal.senderParticipantId] = [];
              }
              earlyIceBufferRef.current[signal.senderParticipantId].push(
                payload.candidate,
              );
            }
          }

          if (Array.isArray(payload.candidates)) {
            for (const candidate of payload.candidates) {
              if (hasRemoteDescription) {
                try {
                  await connection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                  console.warn(
                    `${LOG_TAG} Failed to add batched ICE candidate for peer=${signal.senderParticipantId}:`,
                    err,
                  );
                }
              } else {
                console.debug(
                  `${LOG_TAG} Buffering early batched ICE candidate for peer=${signal.senderParticipantId}`,
                );
                if (!earlyIceBufferRef.current[signal.senderParticipantId]) {
                  earlyIceBufferRef.current[signal.senderParticipantId] = [];
                }
                earlyIceBufferRef.current[signal.senderParticipantId].push(
                  candidate,
                );
              }
            }
          }
        }
      }),
    )
      .then(() =>
        clearSignals({
          signalIds: pendingSignals.map((signal) => signal._id),
        }).catch(() => undefined),
      )
      .catch((err) => {
        console.error(`${LOG_TAG} Signal processing error:`, err);
      });
  }, [
    clearSignals,
    createPeerConnection,
    drainEarlyIceCandidates,
    meetingId,
    participantId,
    sendSignal,
    shouldSkipPeerOperation,
    signals,
  ]);

  const toggleAudio = async () => {
    // Audio uses enabled-flag toggling intentionally: we need to keep the
    // audio track alive for WebRTC signaling continuity across all peers.
    // Stopping and restarting the audio track would require a full
    // renegotiation and could break the transcription pipeline.
    const nextMuted = !isAudioMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsAudioMuted(nextMuted);
    await syncMediaState({ audio: !nextMuted });
  };

  const toggleVideo = async () => {
    // ── CAMERA OFF ───────────────────────────────────────────────────────
    // When turning the camera OFF:
    //   1. Stop every video track on the camera stream → releases hardware
    //   2. Camera LED turns off at OS level
    //   3. Null-out the cameraStreamRef so we don't hold stale references
    //   4. Replace the outgoing track on all peer connections with null so
    //      remote participants see the video as ended
    //
    // WHY NOT track.enabled = false?
    //   It only mutes the data in software. The browser still holds the
    //   camera device open, keeping the LED lit — a privacy issue.
    //
    // ── CAMERA ON ────────────────────────────────────────────────────────
    // When turning the camera ON:
    //   1. Call getUserMedia({ video: true, audio: false }) to re-acquire
    //      the camera at the OS level
    //   2. Store the new stream in cameraStreamRef
    //   3. Replace the outgoing video sender on every RTCPeerConnection
    //      via replaceTrack (no full renegotiation needed in most browsers)
    //
    // A debounce token prevents race conditions from rapid toggling.

    // Mint a new toggle token for this invocation.
    const token = createToggleToken();
    cameraToggleTokenRef.current = token;

    if (!isVideoOff) {
      // ── TURNING OFF ──────────────────────────────────────────────────
      // Stop the hardware first, then update all peers and UI state.
      stopAllVideoTracks(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);

      // Signal peers with a null track — they will see the video as ended.
      await replaceOutgoingVideoTrack(peersRef.current, null);

      setIsVideoOff(true);
      await syncMediaState({ video: false });
    } else {
      // ── TURNING ON ───────────────────────────────────────────────────
      const result = await acquireCameraStream();

      // If the user toggled again while we were waiting for getUserMedia,
      // discard this stale result and do nothing.
      if (cameraToggleTokenRef.current !== token) {
        if (result) stopAllVideoTracks(result.stream);
        return;
      }

      if (!result) {
        toast.error("Could not access camera. Check your browser permissions.");
        return;
      }

      const { stream, videoTrack } = result;

      // Guard: if the track died between getUserMedia resolving and now.
      if (videoTrack.readyState !== "live") {
        stopAllVideoTracks(stream);
        toast.error("Camera track failed to start — please try again.");
        return;
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);

      // Replace the outgoing video track on every peer connection.
      // replaceTrack avoids a full SDP renegotiation in Chrome, Edge, and
      // Safari 15+. The transceiver was pre-created in createPeerConnection,
      // so the sender will always be found.
      await replaceOutgoingVideoTrack(peersRef.current, videoTrack);

      setIsVideoOff(false);
      await syncMediaState({ video: true });
    }
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

      console.debug(
        `${LOG_TAG} Screen share started — track id=${screenTrack.id}`,
      );

      screenTrackRef.current = screenTrack;
      screenTrack.onended = () => {
        console.debug(`${LOG_TAG} Screen share track ended by user/OS`);
        void stopScreenShare();
      };

      await replaceOutgoingVideoTrack(peersRef.current, screenTrack);
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

    console.debug(`${LOG_TAG} Screen share stopped — restoring camera track`);

    // After stopping the screen share, restore the camera track if one is
    // active. If the camera was off when the screen share started, we restore
    // it to null, which the service handles gracefully.
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0] ?? null;
    const isRestoredCameraLive = cameraTrack?.readyState === "live";

    await replaceOutgoingVideoTrack(peersRef.current, cameraTrack);
    setPresentationStream(null);
    setIsScreenSharing(false);

    // If there is no live camera track to restore, mark camera as off.
    await syncMediaState({ screen: false, video: isRestoredCameraLive });
    if (!isRestoredCameraLive) {
      setIsVideoOff(true);
    }
  };

  return {
    participantId,
    localStream,
    cameraStream,
    presentationStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    permissionDenied,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}
