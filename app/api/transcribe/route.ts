import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TRANSCRIPTION_MODEL = "whisper-large-v3";
const PROMPT_LEAK_SNIPPETS = [
  "the speaker may use more than one language",
  "do not translate paraphrase or normalize into a single language",
  "preserve names technical words and original meaning",
  "the speaker may switch naturally between hindi and english",
  "preserve hinglish code switching and do not translate",
  "keep english technical words product names acronyms and people names exactly as spoken",
  "preserve meaning faithfully and avoid rewriting into pure english",
  "do not translate to english",
  "do not translate or paraphrase",
  "preserve names and technical terms accurately",
];

type TranscriptionMode = "auto" | "hinglish" | "hindi" | "english";

function getTranscriptionConfig(mode: string | null) {
  const normalizedMode: TranscriptionMode =
    mode === "hinglish" || mode === "hindi" || mode === "english" ? mode : "auto";

  switch (normalizedMode) {
    case "hinglish":
      return {
        language: "hi" as const,
        prompt: "Hinglish conversation with mixed Hindi and English. Keep names, acronyms, and technical product words as spoken.",
      };
    case "hindi":
      return {
        language: "hi" as const,
        prompt: "Hindi speech. Keep names and technical terms as spoken.",
      };
    case "english":
      return {
        language: "en" as const,
        prompt: "English speech. Keep names and technical terms as spoken.",
      };
    default:
      return {
        language: undefined,
        prompt: "Multilingual speech. Keep names, acronyms, and technical words as spoken.",
      };
  }
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
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as File | null;
    const transcriptionMode = formData.get("mode");

    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json({ text: "" });
    }

    const extension = getFileExtension(audioBlob);
    const file = new File(
      [audioBlob],
      audioBlob.name || `audio.${extension}`,
      { type: audioBlob.type || `audio/${extension}` },
    );
    const config = getTranscriptionConfig(
      typeof transcriptionMode === "string" ? transcriptionMode : null,
    );

    const response = await groq.audio.transcriptions.create({
      file,
      model: TRANSCRIPTION_MODEL,
      response_format: "json",
      language: config.language,
      prompt: config.prompt,
    });

    const text = (response.text ?? "").trim();
    if (isPromptLeak(text, config.prompt)) {
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
