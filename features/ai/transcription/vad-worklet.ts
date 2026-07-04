/**
 * AudioWorklet-based voice activity detection.
 *
 * The previous pipeline ran RMS VAD and Float32 copies inside a
 * `ScriptProcessorNode.onaudioprocess` callback on the MAIN thread, competing
 * with React rendering and WebRTC and janking the UI. This moves all per-sample
 * work to the audio rendering thread. The processor buffers voiced audio and
 * posts one message per detected utterance, so the main thread only ever sees
 * complete segments.
 *
 * The processor source is shipped as a string and registered from a Blob URL,
 * keeping the whole pipeline self-contained (no separate static asset to deploy
 * or version).
 */

export const VAD_WORKLET_NAME = "vad-segmenter";

export type VadParams = {
  /** RMS above which a frame is considered voiced. */
  rmsThreshold: number;
  /** Frames of silence tolerated before a segment is closed. */
  hangoverFrames: number;
  /** Minimum voiced duration (ms) for a segment to be emitted. */
  minVoicedMs: number;
  /** Hard cap on segment length (ms) to bound latency and payload size. */
  maxSegmentMs: number;
  /** Samples per analysis frame. */
  frameSize: number;
};

export const DEFAULT_VAD_PARAMS: VadParams = {
  rmsThreshold: 0.02,
  hangoverFrames: 12,
  minVoicedMs: 350,
  maxSegmentMs: 15_000,
  frameSize: 2048,
};

/**
 * Message posted from the worklet to the main thread for each utterance.
 * `startTime` is the AudioContext time (seconds) at which the segment began —
 * the main thread converts it to wall-clock capture time so ordering reflects
 * when audio was *spoken*, not when Whisper happened to respond.
 */
export type VadSegmentMessage = {
  type: "segment";
  pcm: Float32Array;
  startTime: number;
  seq: number;
};

// Processor source. Kept as a template string; `sampleRate` and `currentTime`
// are AudioWorkletGlobalScope globals.
const PROCESSOR_SOURCE = /* js */ `
class VadSegmenter extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const p = (options && options.processorOptions) || {};
    this.rmsThreshold = p.rmsThreshold ?? 0.02;
    this.hangoverFrames = p.hangoverFrames ?? 12;
    this.minVoicedSamples = Math.floor(((p.minVoicedMs ?? 350) / 1000) * sampleRate);
    this.maxSegmentSamples = Math.floor(((p.maxSegmentMs ?? 15000) / 1000) * sampleRate);
    this.frameSize = p.frameSize ?? 2048;

    this.buffer = new Float32Array(this.maxSegmentSamples);
    this.bufferLength = 0;
    this.voicedSamples = 0;
    this.hasSpeech = false;
    this.hangover = 0;
    this.segmentStartTime = 0;
    this.seq = 0;

    // Frame accumulator so RMS is computed over frameSize, independent of the
    // 128-sample render quantum.
    this.frame = new Float32Array(this.frameSize);
    this.frameFill = 0;
  }

  flush() {
    if (
      this.hasSpeech &&
      this.voicedSamples >= this.minVoicedSamples &&
      this.bufferLength > 0
    ) {
      const pcm = this.buffer.slice(0, this.bufferLength);
      this.port.postMessage(
        { type: "segment", pcm, startTime: this.segmentStartTime, seq: this.seq++ },
        [pcm.buffer],
      );
    }
    this.bufferLength = 0;
    this.voicedSamples = 0;
    this.hasSpeech = false;
    this.hangover = 0;
  }

  appendFrame(frame) {
    if (this.bufferLength === 0) {
      this.segmentStartTime = currentTime;
    }
    const remaining = this.maxSegmentSamples - this.bufferLength;
    const copyLen = Math.min(remaining, frame.length);
    this.buffer.set(frame.subarray(0, copyLen), this.bufferLength);
    this.bufferLength += copyLen;
    if (this.bufferLength >= this.maxSegmentSamples) {
      this.flush();
    }
  }

  processFrame(frame) {
    let sumSquares = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / frame.length);
    const voiced = rms >= this.rmsThreshold;

    if (voiced) {
      this.hasSpeech = true;
      this.hangover = this.hangoverFrames;
      this.voicedSamples += frame.length;
      this.appendFrame(frame);
    } else if (this.hangover > 0) {
      this.hangover -= 1;
      // Keep trailing audio so word tails are not clipped.
      this.appendFrame(frame);
    } else if (this.hasSpeech) {
      this.flush();
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.frame[this.frameFill++] = channel[i];
      if (this.frameFill >= this.frameSize) {
        this.processFrame(this.frame);
        this.frameFill = 0;
      }
    }
    return true;
  }
}

registerProcessor(${JSON.stringify(VAD_WORKLET_NAME)}, VadSegmenter);
`;

let cachedModuleUrl: string | null = null;

/** Returns a cached Blob URL for the worklet module (created once per page). */
export function getVadWorkletModuleUrl(): string {
  if (cachedModuleUrl) return cachedModuleUrl;
  const blob = new Blob([PROCESSOR_SOURCE], { type: "application/javascript" });
  cachedModuleUrl = URL.createObjectURL(blob);
  return cachedModuleUrl;
}
