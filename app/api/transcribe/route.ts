import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TRANSCRIPTION_MODEL = "whisper-large-v3";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const TRANSCRIBE_RATE_LIMIT = 90;
const TRANSCRIBE_RATE_WINDOW_MS = 60_000;
const MAX_NO_SPEECH_PROB = 0.35;
const MIN_AVG_LOGPROB = -0.8;
const MAX_COMPRESSION_RATIO = 2.4;
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

type TranscriptionMode =
  | "auto"
  | "hindi_english_marathi"
  | "hindi_english"
  | "hindi"
  | "marathi"
  | "english";

function getTranscriptionConfig(mode: string | null) {
  const normalizedMode: TranscriptionMode =
    mode === "hindi_english_marathi"
    || mode === "hindi_english"
    || mode === "hindi"
    || mode === "marathi"
    || mode === "english"
      ? mode
      : "auto";

  switch (normalizedMode) {
    case "hindi_english_marathi":
      return {
        language: undefined,
        prompt: "Mixed Hindi, Marathi, and English conversation. Output only the spoken words.",
        scriptMode: "devanagari_latin" as const,
      };
    case "hindi_english":
      return {
        language: "hi" as const,
        prompt: "Mixed Hindi and English conversation. Output only the spoken words.",
        scriptMode: "devanagari_latin" as const,
      };
    case "hindi":
      return {
        language: "hi" as const,
        prompt: "Hindi speech. Output only the spoken words.",
        scriptMode: "devanagari_latin" as const,
      };
    case "marathi":
      return {
        language: "mr" as const,
        prompt: "Marathi speech. Output only the spoken words.",
        scriptMode: "devanagari_latin" as const,
      };
    case "english":
      return {
        language: "en" as const,
        prompt: "English speech. Output only the spoken words.",
        scriptMode: "latin_only" as const,
      };
    default:
      return {
        language: "hi" as const,
        prompt: "Indian multilingual speech (Hindi, Marathi, English). Output only the spoken words.",
        scriptMode: "devanagari_latin" as const,
      };
  }
}

function hasUnsupportedScript(text: string, scriptMode: "devanagari_latin" | "latin_only") {
  if (!text.trim()) return false;

  // Latin letters and common punctuation/numbers
  const latin = /[A-Za-z]/;
  const devanagari = /[\u0900-\u097F]/;

  for (const ch of text) {
    if (/[\d\s.,!?'"`~@#$%^&*()_\-+=:;<>/\\|[\]{}]/.test(ch)) continue;
    if (scriptMode === "latin_only") {
      if (latin.test(ch)) continue;
      return true;
    }
    if (latin.test(ch) || devanagari.test(ch)) continue;
    return true;
  }

  return false;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function isPromptLeak(text: string, prompt: string | undefined) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return false;

  const normalizedPrompt = prompt ? normalizeText(prompt) : "";
  if (normalizedPrompt && normalizedText.length >= 24 && normalizedPrompt.includes(normalizedText)) {
    return true;
  }

  return PROMPT_LEAK_SNIPPETS.some((snippet) => normalizedText.includes(snippet));
}

function isInstructionArtifact(text: string) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return false;

  return INSTRUCTION_ARTIFACTS.some((artifact) =>
    normalizedText === artifact || normalizedText.startsWith(artifact),
  );
}

function getFileExtension(file: File) {
  const filename = file.name || "";
  const lastSegment = filename.split(".").pop()?.toLowerCase();

  if (lastSegment && lastSegment !== filename.toLowerCase()) {
    return lastSegment;
  }

  const mimeType = file.type.toLowerCase();
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (
      isRateLimited(
        `transcribe:${ip}`,
        TRANSCRIBE_RATE_LIMIT,
        TRANSCRIBE_RATE_WINDOW_MS,
      )
    ) {
      return NextResponse.json(
        { error: "Too many transcription requests", text: "" },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const audioBlob = formData.get("audio") as File | null;
    const transcriptionMode = formData.get("mode");

    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json({ text: "" });
    }
    if (audioBlob.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio chunk too large", text: "" },
        { status: 413 },
      );
    }

    const extension = getFileExtension(audioBlob);
    const file = new File(
      [audioBlob],
      audioBlob.name || `audio.${extension}`,
      { type: audioBlob.type || `audio/${extension}` },
    );
    const config = getTranscriptionConfig(
      typeof transcriptionMode === "string"
        ? transcriptionMode.trim().toLowerCase()
        : null,
    );

    const response = await groq.audio.transcriptions.create({
      file,
      model: TRANSCRIPTION_MODEL,
      response_format: "verbose_json",
      language: config.language,
      prompt: config.prompt,
      temperature: 0,
    }) as unknown as {
      text: string;
      segments?: {
        text: string;
        no_speech_prob?: number;
        avg_logprob?: number;
        compression_ratio?: number;
      }[];
    };

    let text = "";
    if (response.segments && Array.isArray(response.segments)) {
      const validSegments = response.segments.filter((seg) => {
        // Drop noisy/hallucinated segments more aggressively.
        if (typeof seg.no_speech_prob === "number" && seg.no_speech_prob > MAX_NO_SPEECH_PROB) return false;
        if (typeof seg.avg_logprob === "number" && seg.avg_logprob < MIN_AVG_LOGPROB) return false;
        if (typeof seg.compression_ratio === "number" && seg.compression_ratio > MAX_COMPRESSION_RATIO) return false;
        if (!seg.text || seg.text.trim().length < 2) return false;
        if (hasUnsupportedScript(seg.text, config.scriptMode)) return false;
        return true;
      });
      text = validSegments.map((seg) => seg.text).join(" ").replace(/\s+/g, " ").trim();
    } else {
      text = (response.text ?? "").trim();
      if (hasUnsupportedScript(text, config.scriptMode)) {
        text = "";
      }
    }

    if (isPromptLeak(text, config.prompt)) {
      return NextResponse.json({ text: "" });
    }
    if (isInstructionArtifact(text)) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[transcribe] Groq error:", error);
    return NextResponse.json(
      { error: "Transcription failed", text: "" },
      { status: error instanceof Groq.APIError ? error.status || 502 : 500 },
    );
  }
}
