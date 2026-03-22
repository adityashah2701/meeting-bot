import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TRANSCRIPTION_MODEL = "whisper-large-v3";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const TRANSCRIBE_RATE_LIMIT = 90;
const TRANSCRIBE_RATE_WINDOW_MS = 60_000;
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
    }) as unknown as { text: string; segments?: { text: string; no_speech_prob?: number; avg_logprob?: number }[] };

    let text = "";
    if (response.segments && Array.isArray(response.segments)) {
      const validSegments = response.segments.filter((seg) => {
        // Drop noisy/hallucinated segments (1.4 Add Confidence Filtering)
        if (seg.no_speech_prob && seg.no_speech_prob > 0.5) return false;
        if (seg.avg_logprob && seg.avg_logprob < -1.0) return false;
        return true;
      });
      text = validSegments.map((seg) => seg.text).join(" ").replace(/\s+/g, " ").trim();
    } else {
      text = (response.text ?? "").trim();
    }

    if (isPromptLeak(text, config.prompt)) {
      return NextResponse.json({ text: "" });
    }

    if (text) {
      // 1.2 Add AI Cleanup Layer (MANDATORY)
      try {
        const cleanupResponse = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant that cleans up and corrects transcriptions. Fix the following transcription which may contain mixed Hindi and English (Hinglish). Do not change meaning. Do not hallucinate. Return clean and accurate text. Only return the final corrected string, with no quotes, commentary, or extra formatting.",
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        });

        const cleanedText = cleanupResponse.choices[0]?.message?.content?.trim();
        if (cleanedText) {
          if (!isPromptLeak(cleanedText, config.prompt)) {
             text = cleanedText;
          } else {
             text = "";
          }
        }
      } catch (cleanupError) {
        console.error("[transcribe] Cleanup error:", cleanupError);
      }
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
