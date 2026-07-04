/**
 * Pure post-processing filters for Whisper output. Extracted from the route so
 * they can be unit-tested in isolation and kept off the request hot path's
 * cognitive load. No I/O, no framework types.
 */
import type { TranscriptionScriptMode } from "@/lib/transcription/modes";

// Segment quality thresholds — drop noisy / hallucinated Whisper segments.
// -1.0 is a safe lower bound: Whisper average log-prob below this is reliably
// noise/silence. -0.8 was rejecting legitimate low-energy speech.
export const MAX_NO_SPEECH_PROB = 0.35;
export const MIN_AVG_LOGPROB = -1.0;
export const MAX_COMPRESSION_RATIO = 2.4;

const PROMPT_LEAK_SNIPPETS = [
  "output only the spoken words",
  "do not translate",
  "do not translate or paraphrase",
  "preserve names and technical terms",
];

const INSTRUCTION_ARTIFACTS = [
  "do not translate",
  "don't translate",
  "do not translate or paraphrase",
  "preserve names and technical terms",
  "keep names and technical terms as spoken",
  "keep code switching",
];

const LATIN = /[A-Za-z]/;
const DEVANAGARI = /[\u0900-\u097F]/;
// Skip: ASCII punctuation/digits, common Unicode punctuation, non-breaking
// spaces, curly quotes, ellipsis, em-dash, etc. — Whisper occasionally emits
// these and they should NOT trigger the script filter.
const SKIP_CHAR = /[\d\s\p{P}\p{S}\p{Z}]/u;

export function hasUnsupportedScript(
  text: string,
  scriptMode: TranscriptionScriptMode,
): boolean {
  if (!text.trim()) return false;

  for (const ch of text) {
    // Punctuation, symbols, digits, and whitespace are allowed in any mode \u2014
    // they are not script-specific and Whisper commonly emits them.
    if (SKIP_CHAR.test(ch)) continue;
    if (scriptMode === "latin_only") {
      if (LATIN.test(ch)) continue;
      return true;
    }
    if (LATIN.test(ch) || DEVANAGARI.test(ch)) continue;
    return true;
  }

  return false;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPromptLeak(text: string, prompt: string | undefined): boolean {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return false;

  const normalizedPrompt = prompt ? normalizeText(prompt) : "";
  if (
    normalizedPrompt &&
    normalizedText.length >= 24 &&
    normalizedPrompt.includes(normalizedText)
  ) {
    return true;
  }

  return PROMPT_LEAK_SNIPPETS.some((snippet) => normalizedText.includes(snippet));
}

export function isInstructionArtifact(text: string): boolean {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return false;

  return INSTRUCTION_ARTIFACTS.some(
    (artifact) =>
      normalizedText === artifact || normalizedText.startsWith(artifact),
  );
}

export type WhisperSegment = {
  text: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
};

export type WhisperResponse = {
  text: string;
  segments?: WhisperSegment[];
};

export type SegmentDropReason =
  | "no_speech_prob"
  | "avg_logprob"
  | "compression_ratio"
  | "short_text"
  | "unsupported_script";

export type ExtractResult = {
  text: string;
  segmentsTotal: number;
  segmentsKept: number;
  /** Tally of why segments were dropped — for observability. */
  dropReasons: Partial<Record<SegmentDropReason, number>>;
};

/**
 * Collapses a Whisper verbose_json response into clean text, dropping
 * low-confidence and off-script segments. Returns text, counts, and per-reason
 * drop tallies for observability.
 */
export function extractCleanText(
  response: WhisperResponse,
  scriptMode: TranscriptionScriptMode,
): ExtractResult {
  if (response.segments && Array.isArray(response.segments)) {
    const total = response.segments.length;
    const dropReasons: Partial<Record<SegmentDropReason, number>> = {};
    const bump = (r: SegmentDropReason) => {
      dropReasons[r] = (dropReasons[r] ?? 0) + 1;
    };

    const kept = response.segments.filter((seg) => {
      if (typeof seg.no_speech_prob === "number" && seg.no_speech_prob > MAX_NO_SPEECH_PROB) {
        bump("no_speech_prob"); return false;
      }
      if (typeof seg.avg_logprob === "number" && seg.avg_logprob < MIN_AVG_LOGPROB) {
        bump("avg_logprob"); return false;
      }
      if (typeof seg.compression_ratio === "number" && seg.compression_ratio > MAX_COMPRESSION_RATIO) {
        bump("compression_ratio"); return false;
      }
      if (!seg.text || seg.text.trim().length < 2) {
        bump("short_text"); return false;
      }
      if (hasUnsupportedScript(seg.text, scriptMode)) {
        bump("unsupported_script"); return false;
      }
      return true;
    });

    const text = kept
      .map((seg) => seg.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return { text, segmentsTotal: total, segmentsKept: kept.length, dropReasons };
  }

  // No segments array — fall back to the top-level text field.
  let text = (response.text ?? "").trim();
  if (hasUnsupportedScript(text, scriptMode)) text = "";
  return { text, segmentsTotal: text ? 1 : 0, segmentsKept: text ? 1 : 0, dropReasons: {} };
}
