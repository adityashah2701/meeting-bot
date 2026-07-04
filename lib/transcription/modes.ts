/**
 * Single source of truth for transcription language modes.
 *
 * Previously the `TranscriptionMode` union and the mode -> language/prompt
 * mapping lived independently in the client hook and the `/api/transcribe`
 * route, which meant a change in one place silently diverged from the other.
 * This module is framework-agnostic (no browser or Node APIs) so it can be
 * imported by both the client bundle and the server route.
 */

export type TranscriptionMode =
  | "auto"
  | "hindi_english_marathi"
  | "hindi_english"
  | "hindi"
  | "marathi"
  | "english";

export type TranscriptionScriptMode = "devanagari_latin" | "latin_only";

export type TranscriptionConfig = {
  /** Whisper `language` hint, or `undefined` for auto-detect. */
  language: "hi" | "mr" | "en" | undefined;
  /** Whisper decoding prompt. */
  prompt: string;
  /** Which scripts are considered valid output for post-filtering. */
  scriptMode: TranscriptionScriptMode;
};

export const TRANSCRIPTION_MODES: readonly TranscriptionMode[] = [
  "auto",
  "hindi_english_marathi",
  "hindi_english",
  "hindi",
  "marathi",
  "english",
] as const;

export function isTranscriptionMode(value: unknown): value is TranscriptionMode {
  return (
    typeof value === "string" &&
    (TRANSCRIPTION_MODES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes arbitrary input (query param, form field, localStorage value)
 * into a known `TranscriptionMode`, defaulting to `"auto"`.
 */
export function normalizeTranscriptionMode(value: unknown): TranscriptionMode {
  if (typeof value !== "string") return "auto";
  const trimmed = value.trim().toLowerCase();
  return isTranscriptionMode(trimmed) ? trimmed : "auto";
}

/**
 * Resolves the Whisper decoding config for a given mode. Accepts raw input
 * and normalizes it, so callers do not need to pre-validate.
 */
export function getTranscriptionConfig(mode: unknown): TranscriptionConfig {
  switch (normalizeTranscriptionMode(mode)) {
    case "hindi_english_marathi":
      return {
        language: undefined,
        prompt:
          "Mixed Hindi, Marathi, and English conversation. Output only the spoken words.",
        scriptMode: "devanagari_latin",
      };
    case "hindi_english":
      return {
        language: "hi",
        prompt: "Mixed Hindi and English conversation. Output only the spoken words.",
        scriptMode: "devanagari_latin",
      };
    case "hindi":
      return {
        language: "hi",
        prompt: "Hindi speech. Output only the spoken words.",
        scriptMode: "devanagari_latin",
      };
    case "marathi":
      return {
        language: "mr",
        prompt: "Marathi speech. Output only the spoken words.",
        scriptMode: "devanagari_latin",
      };
    case "english":
      return {
        language: "en",
        prompt: "English speech. Output only the spoken words.",
        scriptMode: "latin_only",
      };
    default:
      return {
        language: "hi",
        prompt:
          "Indian multilingual speech (Hindi, Marathi, English). Output only the spoken words.",
        scriptMode: "devanagari_latin",
      };
  }
}
