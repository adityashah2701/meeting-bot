"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((
        event: {
          resultIndex: number;
          results: ArrayLike<{
            isFinal: boolean;
            0: { transcript: string };
          }>;
        },
      ) => void)
    | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type TranscriptLine = {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  isInterim?: boolean;
  timestamp: number;
};

export function useTranscription({
  enabled,
  userName,
  userId,
  onTranscript,
}: {
  enabled: boolean;
  userName: string;
  userId: string;
  onTranscript: (line: TranscriptLine) => void;
}) {
  const Constructor =
    typeof window === "undefined"
      ? undefined
      : window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(
    Constructor ? null : "Speech recognition is not supported in this browser.",
  );

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!Constructor) {
      return;
    }

    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(`Transcription error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const segment = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) {
          finalText += segment;
        } else {
          interimText += segment;
        }
      }

      const timestamp = Date.now();
      if (finalText.trim()) {
        onTranscript({
          id: `final-${timestamp}`,
          sender: userName,
          senderId: userId,
          text: finalText.trim(),
          timestamp,
        });
      } else if (interimText.trim()) {
        onTranscript({
          id: "interim-local",
          sender: userName,
          senderId: userId,
          text: interimText.trim(),
          timestamp,
          isInterim: true,
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (enabled) {
        restartTimeoutRef.current = setTimeout(startRecognition, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.abort();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [Constructor, enabled, onTranscript, startRecognition, userId, userName]);

  useEffect(() => {
    if (!recognitionRef.current) {
      return;
    }

    if (enabled && !isListening) {
      startRecognition();
      return;
    }

    if (!enabled && isListening) {
      recognitionRef.current.stop();
    }
  }, [enabled, isListening, startRecognition]);

  return { isListening, error };
}
