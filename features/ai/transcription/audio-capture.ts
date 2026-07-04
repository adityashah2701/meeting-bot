/**
 * Microphone capture + voice-activity segmentation.
 *
 * Prefers an AudioWorklet (off the main thread). Falls back to the deprecated
 * ScriptProcessorNode only when `audioWorklet` is unavailable, so older
 * browsers still work (graceful degradation). Either way the caller receives a
 * uniform stream of complete voiced segments tagged with a wall-clock capture
 * timestamp and a monotonic sequence number — the two things needed to keep
 * transcripts correctly ordered regardless of upstream latency.
 */
import {
  DEFAULT_VAD_PARAMS,
  VAD_WORKLET_NAME,
  getVadWorkletModuleUrl,
  type VadParams,
  type VadSegmentMessage,
} from "./vad-worklet";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type CapturedSegment = {
  pcm: Float32Array;
  sampleRate: number;
  /** Wall-clock ms at which this utterance began (for ordering). */
  captureStartTs: number;
  /** Monotonic index within this capture session. */
  seq: number;
};

export type AudioCaptureHandle = {
  stop: () => Promise<void>;
  usingWorklet: boolean;
};

export type StartAudioCaptureOptions = {
  stream: MediaStream;
  params?: VadParams;
  onSegment: (segment: CapturedSegment) => void;
  onError?: (error: Error) => void;
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  return window.AudioContext ?? window.webkitAudioContext;
}

export async function startAudioCapture(
  options: StartAudioCaptureOptions,
): Promise<AudioCaptureHandle> {
  const { stream, onSegment, onError } = options;
  const params = options.params ?? DEFAULT_VAD_PARAMS;

  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) {
    throw new Error("Web Audio is not supported in this browser.");
  }

  const liveAudioTracks = stream
    .getAudioTracks()
    .filter((track) => track.readyState === "live");
  if (liveAudioTracks.length === 0) {
    throw new Error("No live audio track found in the stream.");
  }

  const audioContext = new AudioContextCtor();
  await audioContext.resume();

  const source = audioContext.createMediaStreamSource(
    new MediaStream(liveAudioTracks),
  );
  const sampleRate = audioContext.sampleRate;

  // Map AudioContext time -> wall clock, captured at start so every segment's
  // start time can be translated consistently.
  const t0Wall = Date.now();
  const t0Audio = audioContext.currentTime;
  const toWallClock = (audioTime: number) =>
    Math.round(t0Wall + (audioTime - t0Audio) * 1000);

  const canUseWorklet = typeof audioContext.audioWorklet?.addModule === "function";

  if (canUseWorklet) {
    try {
      await audioContext.audioWorklet.addModule(getVadWorkletModuleUrl());
      const node = new AudioWorkletNode(audioContext, VAD_WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        processorOptions: params,
      });

      node.port.onmessage = (event: MessageEvent<VadSegmentMessage>) => {
        const data = event.data;
        if (data?.type !== "segment") return;
        onSegment({
          pcm: data.pcm,
          sampleRate,
          captureStartTs: toWallClock(data.startTime),
          seq: data.seq,
        });
      };

      // A zero-gain sink keeps the graph pulling without audible output.
      const sink = audioContext.createGain();
      sink.gain.value = 0;
      source.connect(node);
      node.connect(sink);
      sink.connect(audioContext.destination);

      return {
        usingWorklet: true,
        stop: async () => {
          node.port.onmessage = null;
          safeDisconnect(node);
          safeDisconnect(source);
          safeDisconnect(sink);
          await closeContext(audioContext);
        },
      };
    } catch (error) {
      // Fall through to ScriptProcessor if module load/instantiation fails.
      onError?.(error as Error);
    }
  }

  return startScriptProcessorFallback({
    audioContext,
    source,
    sampleRate,
    params,
    toWallClock,
    onSegment,
  });
}

/**
 * Legacy fallback: replicates the VAD on the main thread. Only used when
 * AudioWorklet is unavailable. Kept intentionally compact.
 */
function startScriptProcessorFallback(args: {
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  sampleRate: number;
  params: VadParams;
  toWallClock: (audioTime: number) => number;
  onSegment: (segment: CapturedSegment) => void;
}): AudioCaptureHandle {
  const { audioContext, source, sampleRate, params, toWallClock, onSegment } = args;

  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const sink = audioContext.createGain();
  sink.gain.value = 0;

  const minVoicedSamples = Math.floor((params.minVoicedMs / 1000) * sampleRate);
  const maxSegmentSamples = Math.floor((params.maxSegmentMs / 1000) * sampleRate);

  let chunks: Float32Array[] = [];
  let bufferLength = 0;
  let voicedSamples = 0;
  let hasSpeech = false;
  let hangover = 0;
  let segmentStartTime = 0;
  let seq = 0;

  const flush = () => {
    if (hasSpeech && voicedSamples >= minVoicedSamples && bufferLength > 0) {
      const pcm = new Float32Array(bufferLength);
      let offset = 0;
      for (const chunk of chunks) {
        pcm.set(chunk, offset);
        offset += chunk.length;
      }
      onSegment({
        pcm,
        sampleRate,
        captureStartTs: toWallClock(segmentStartTime),
        seq: seq++,
      });
    }
    chunks = [];
    bufferLength = 0;
    voicedSamples = 0;
    hasSpeech = false;
    hangover = 0;
  };

  const append = (input: Float32Array) => {
    if (bufferLength === 0) segmentStartTime = audioContext.currentTime;
    const copy = new Float32Array(input.length);
    copy.set(input);
    chunks.push(copy);
    bufferLength += copy.length;
    if (bufferLength >= maxSegmentSamples) flush();
  };

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    let sumSquares = 0;
    for (let i = 0; i < input.length; i += 1) {
      const s = input[i] ?? 0;
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / input.length);
    const voiced = rms >= params.rmsThreshold;

    if (voiced) {
      hasSpeech = true;
      hangover = params.hangoverFrames;
      voicedSamples += input.length;
      append(input);
    } else if (hangover > 0) {
      hangover -= 1;
      append(input);
    } else if (hasSpeech) {
      flush();
    }
  };

  source.connect(processor);
  processor.connect(sink);
  sink.connect(audioContext.destination);

  return {
    usingWorklet: false,
    stop: async () => {
      processor.onaudioprocess = null;
      safeDisconnect(processor);
      safeDisconnect(source);
      safeDisconnect(sink);
      await closeContext(audioContext);
    },
  };
}

function safeDisconnect(node: AudioNode) {
  try {
    node.disconnect();
  } catch {
    // Ignore disconnect failures during teardown.
  }
}

async function closeContext(audioContext: AudioContext) {
  if (audioContext.state !== "closed") {
    await audioContext.close().catch(() => undefined);
  }
}
