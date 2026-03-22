import Groq from "groq-sdk";
import { NextResponse } from "next/server";

type TranscriptInput = {
  sender: string;
  text: string;
};

type SummaryPayload = {
  summary: string;
  actionItems: string[];
};

const SUMMARY_MODEL = "llama3-70b-8192";
const REQUEST_TIMEOUT_MS = 15_000;

function parseJsonPayload(content: string | null | undefined): SummaryPayload | null {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Partial<SummaryPayload>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const actionItems = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    if (!summary) {
      return null;
    }

    return {
      summary,
      actionItems,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let transcript: TranscriptInput[];

  try {
    const payload = (await req.json()) as { transcript?: TranscriptInput[] };
    transcript = payload.transcript ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const normalizedTranscript = transcript
    .map((entry) => ({
      sender: entry.sender?.trim(),
      text: entry.text?.trim(),
    }))
    .filter((entry) => entry.sender && entry.text);

  if (normalizedTranscript.length === 0) {
    return NextResponse.json(
      { error: "No transcript provided" },
      { status: 400 },
    );
  }

  const formattedTranscript = normalizedTranscript
    .map((entry) => `${entry.sender}: ${entry.text}`)
    .join("\n");

  const groq = new Groq({
    apiKey,
    maxRetries: 0,
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: SUMMARY_MODEL,
        temperature: 0.2,
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are an expert meeting assistant.",
              "Return valid JSON only.",
              'Respond with this exact shape: {"summary":"markdown summary","actionItems":["task one","task two"]}.',
              "The summary should be concise and professional, with short markdown sections for overview, decisions, and risks/blockers when relevant.",
              "Action items must be short, concrete, and deduplicated. Return an empty array when there are none.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              "Summarize the following meeting transcript and extract actionable follow-up items.",
              "Transcript:",
              formattedTranscript,
            ].join("\n\n"),
          },
        ],
      },
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    const content = completion.choices[0]?.message?.content;
    const parsed = parseJsonPayload(content);

    if (!parsed) {
      return NextResponse.json(
        { error: "Groq returned an invalid response" },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Groq.APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: "Summary generation timed out" },
        { status: 504 },
      );
    }

    if (error instanceof Groq.APIError) {
      return NextResponse.json(
        { error: error.message || "Groq request failed" },
        { status: error.status || 502 },
      );
    }

    console.error("API Summarize Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
