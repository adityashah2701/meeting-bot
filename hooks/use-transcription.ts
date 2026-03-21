'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface TranscriptLine {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  isInterim?: boolean;
  timestamp: number;
}

export function useTranscription({
  userName = 'You',
  userId = 'local',
  isEnabled = true,
  onNewTranscript,
}: {
  userName?: string;
  userId?: string;
  isEnabled?: boolean;
  onNewTranscript?: (line: TranscriptLine) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Restart loop reference
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // We want live typing effects
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment;
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Generate a stable ID for the current speaking block
      // In a real app, you might group statements by time window
      const baseId = `speech-${Date.now()}`;

      if (finalTranscript.trim() !== '') {
        const line: TranscriptLine = {
          id: `${baseId}-final`,
          sender: userName,
          senderId: userId,
          text: finalTranscript.trim(),
          isInterim: false,
          timestamp: Date.now(),
        };
        if (onNewTranscript) onNewTranscript(line);
      } else if (interimTranscript.trim() !== '') {
        const line: TranscriptLine = {
          id: 'interim-local', // Use a constant ID to overwrite the current interim line
          sender: userName,
          senderId: userId,
          text: interimTranscript.trim(),
          isInterim: true,
          timestamp: Date.now(),
        };
        if (onNewTranscript) onNewTranscript(line);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error !== 'no-speech') {
        setError(`Transcription error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if it's supposed to be enabled (it stops automatically on silence)
      if (isEnabled) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore start errors
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
  }, [isEnabled, userName, userId, onNewTranscript]);

  useEffect(() => {
    initRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [initRecognition]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isEnabled && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already started
      }
    } else if (!isEnabled && isListening) {
      recognitionRef.current.stop();
    }
  }, [isEnabled, isListening]);

  return { isListening, error };
}
