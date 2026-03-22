/**
 * camera-track-manager.ts
 *
 * A singleton-style service that owns the camera MediaStream lifecycle.
 *
 * WHY track.stop() INSTEAD OF track.enabled = false
 * ──────────────────────────────────────────────────
 * `track.enabled = false` is a *software mute*. The browser still holds an
 * exclusive hardware lock on the camera device, so the OS-level camera LED
 * remains lit and the device cannot be used by other apps. Users see this as
 * a privacy violation, and it violates the principle of least privilege.
 *
 * `track.stop()` signals the browser to release the hardware capture device
 * entirely. The OS then turns off the camera LED. When the user turns the
 * camera back on, a new `getUserMedia` call re-acquires the device, creating
 * a fresh track that must be renegotiated with each RTCPeerConnection via
 * replaceTrack().
 *
 * TRADE-OFFS
 * ──────────
 * - Rapid toggle (stop → start) causes a brief renegotiation round-trip;
 *   a debounce guard prevents redundant calls.
 * - A new getUserMedia call triggers a permissions prompt only if the user
 *   previously denied access; if the device is already granted, it re-acquires
 *   silently.
 *
 * USAGE
 * ─────
 * This module is NOT a React hook — it is a plain TS class that the hook
 * `use-webrtc.ts` delegates to. This makes it unit-testable without a DOM
 * and avoids logic scattering across hook closures.
 */

/** Minimal result returned after acquiring a new camera stream. */
export interface CameraAcquireResult {
  stream: MediaStream;
  videoTrack: MediaStreamTrack;
}

// ─── Debug utility ────────────────────────────────────────────────────────────

/**
 * Log the state of every track on a stream. Useful for production debugging.
 *
 * Call from browser DevTools: import the module and run
 *   debugStreamState(stream)
 */
export function debugStreamState(
  stream: MediaStream | null | undefined,
  label = "stream",
): void {
  if (!stream) {
    console.debug(`[CameraTrackManager] ${label}: null/undefined`);
    return;
  }

  const tracks = stream.getTracks();
  console.debug(
    `[CameraTrackManager] ${label} — id=${stream.id} tracks=${tracks.length}`,
  );
  tracks.forEach((track) => {
    console.debug(
      `  [${track.kind}] id=${track.id} label="${track.label}" readyState=${track.readyState} enabled=${track.enabled}`,
    );
  });
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Fully stop every video track on a given stream and optionally clear the
 * stream reference on a video element.
 *
 * Iterating over all video tracks handles edge cases where a stream may have
 * accumulated multiple tracks (e.g. after a failed replaceTrack attempt left
 * a dangling track behind).
 */
export function stopAllVideoTracks(
  stream: MediaStream | null | undefined,
  videoEl?: HTMLVideoElement | null,
): void {
  if (!stream) return;

  stream.getVideoTracks().forEach((track) => {
    if (track.readyState !== "ended") {
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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints ?? true,
      audio: false, // audio is managed separately; do not mix here
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      // Shouldn't happen, but guard against broken browser implementations.
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    return { stream, videoTrack };
  } catch (err) {
    // NotAllowedError = user denied; NotFoundError = no camera present.
    // Callers decide how to surface these to the UI.
    console.warn("[CameraTrackManager] acquireCameraStream failed:", err);
    return null;
  }
}

/**
 * Replace the outgoing video sender on every active RTCPeerConnection.
 *
 * Uses `replaceTrack` which avoids a full SDP renegotiation in most browsers
 * (Chrome, Edge, Safari 15+). If no video sender exists on a peer, this is a
 * no-op for that peer — which is safe.
 *
 * Pass `null` to effectively "black out" the remote video feed when turning
 * the camera off WITHOUT stopping the sender (useful if you want to signal a
 * black frame instead of removing the track entirely).
 * In our case we pass a live track when turning on and do not call this when
 * turning off — the remote side sees the track go "muted" via the `readyState`
 * change event on the ended track automatically.
 */
export async function replaceOutgoingVideoTrack(
  peers: Record<string, RTCPeerConnection>,
  track: MediaStreamTrack | null,
): Promise<void> {
  await Promise.all(
    Object.values(peers).map(async (pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        try {
          await sender.replaceTrack(track);
        } catch (err) {
          // replaceTrack can throw if the connection is in a terminal state.
          console.warn("[CameraTrackManager] replaceTrack failed:", err);
        }
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
