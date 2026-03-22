
const LOG_TAG = "[CameraTrackManager]";

export interface CameraAcquireResult {
  stream: MediaStream;
  videoTrack: MediaStreamTrack;
}

export function debugStreamState(
  stream: MediaStream | null | undefined,
  label = "stream",
): void {
  if (!stream) {
    console.debug(`${LOG_TAG} ${label}: null/undefined`);
    return;
  }

  const tracks = stream.getTracks();
  console.debug(
    `${LOG_TAG} ${label} — id=${stream.id} tracks=${tracks.length}`,
  );
  tracks.forEach((track) => {
    console.debug(
      `  [${track.kind}] id=${track.id} label="${track.label}" readyState=${track.readyState} enabled=${track.enabled}`,
    );
  });
}

export function stopAllVideoTracks(
  stream: MediaStream | null | undefined,
  videoEl?: HTMLVideoElement | null,
): void {
  if (!stream) return;

  stream.getVideoTracks().forEach((track) => {
    if (track.readyState !== "ended") {
      console.debug(`${LOG_TAG} Stopping video track id=${track.id} label="${track.label}"`);
      track.stop(); // ← releases the hardware; LED turns off
    }
  });

  // Clear the video element srcObject so the browser stops rendering stale
  // frames and doesn't hold its own internal reference to the ended track.
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

/**
 * Acquire a new camera-only stream (no microphone — it stays active via the
 * existing audio-only path).
 *
 * Returns null if the user denies the permission prompt.
 */
export async function acquireCameraStream(constraints?: MediaTrackConstraints): Promise<CameraAcquireResult | null> {
  try {
    console.debug(`${LOG_TAG} Acquiring camera stream…`);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints ?? true,
      audio: false, // audio is managed separately; do not mix here
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      // Shouldn't happen, but guard against broken browser implementations.
      stream.getTracks().forEach((t) => t.stop());
      console.warn(`${LOG_TAG} getUserMedia returned no video tracks`);
      return null;
    }

    console.debug(
      `${LOG_TAG} Camera acquired — track id=${videoTrack.id} label="${videoTrack.label}" readyState=${videoTrack.readyState}`,
    );
    return { stream, videoTrack };
  } catch (err) {
    // NotAllowedError = user denied; NotFoundError = no camera present.
    // Callers decide how to surface these to the UI.
    console.warn(`${LOG_TAG} acquireCameraStream failed:`, err);
    return null;
  }
}

/**
 * Replace the outgoing video sender on every active RTCPeerConnection.
 *
 * Uses `replaceTrack` which avoids a full SDP renegotiation in most browsers
 * (Chrome, Edge, Safari 15+).
 *
 * CRITICAL FIX: The previous implementation searched for senders where
 * `s.track?.kind === "video"`, which fails when the sender's track is null
 * (camera was off). We now find the video sender via transceivers, which
 * always have a receiver.track.kind that reflects the media type.
 *
 * Pass `null` to effectively "black out" the remote video feed when turning
 * the camera off.
 */
export async function replaceOutgoingVideoTrack(
  peers: Record<string, RTCPeerConnection>,
  track: MediaStreamTrack | null,
): Promise<void> {
  console.debug(
    `${LOG_TAG} replaceOutgoingVideoTrack — track=${track ? `id=${track.id} readyState=${track.readyState}` : "null"} peers=${Object.keys(peers).length}`,
  );

  await Promise.all(
    Object.entries(peers).map(async ([peerId, pc]) => {
      // Find the video sender via transceivers — this works even when the
      // sender's current track is null (camera was off when peer connected).
      const videoTransceiver = pc.getTransceivers().find(
        (t) =>
          t.receiver.track?.kind === "video" ||
          t.sender.track?.kind === "video",
      );
      const sender = videoTransceiver?.sender;

      if (sender) {
        try {
          await sender.replaceTrack(track);
          console.debug(
            `${LOG_TAG} replaceTrack succeeded for peer=${peerId}`,
          );
        } catch (err) {
          // replaceTrack can throw if the connection is in a terminal state.
          console.warn(
            `${LOG_TAG} replaceTrack failed for peer=${peerId}:`,
            err,
          );
        }
      } else {
        console.warn(
          `${LOG_TAG} No video sender found for peer=${peerId} — cannot replace track`,
        );
      }
    }),
  );
}

// ─── Rapid-toggle debounce ────────────────────────────────────────────────────

/**
 * A simple debounce token used by the hook to prevent race conditions when the
 * user rapidly toggles the camera.  The hook stores this ref value and checks
 * it before applying async results.
 */
export function createToggleToken(): symbol {
  return Symbol("camera-toggle");
}
