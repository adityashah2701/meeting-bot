"use client";

import { useEffect, useState } from "react";

export function useAudioActivity(stream: MediaStream | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream) {
      return;
    }

    const [audioTrack] = stream.getAudioTracks();
    if (!audioTrack) {
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let frameId = 0;

    const read = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((total, value) => total + value, 0) / dataArray.length;
      setIsSpeaking(average > 16);
      frameId = window.requestAnimationFrame(read);
    };

    read();

    return () => {
      window.cancelAnimationFrame(frameId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => undefined);
    };
  }, [stream]);

  return stream ? isSpeaking : false;
}
