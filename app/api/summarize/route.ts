import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

type TranscriptInput = {
  sender: string;
  text: string;
};

type ActionItem = {
  task: string;
  assignee: string | null;
  due: string | null;
};

export type SummaryPayload = {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  /** Flat list of task titles — kept for backwards compatibility with createTasksFromSummary */
  actionItems: string[];
};

const SUMMARY_MODEL = "llama-3.3-70b-versatile";
const REQUEST_TIMEOUT_MS = 20_000;
const SUMMARY_RATE_LIMIT = 30;
const SUMMARY_RATE_WINDOW_MS = 60_000;

function sanitizeInput(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonPayload(content: string | null | undefined): SummaryPayload | null {
  if (!content) return null;

  try {
    // Strip markdown code fences the model sometimes wraps output in
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) return null;

    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
        : [];

    const rawItems = Array.isArray(parsed.action_items) ? parsed.action_items : [];
    const action_items: ActionItem[] = rawItems.map((item) => {
      if (typeof item === "string") return { task: item, assignee: null, due: null };
      const obj = item as Record<string, unknown>;
      return {
        task: typeof obj.task === "string" ? obj.task.trim() : String(obj),
        assignee: typeof obj.assignee === "string" ? obj.assignee.trim() : null,
        due: typeof obj.due === "string" ? obj.due.trim() : null,
      };
    });

    return {
      summary,
      key_points: toStringArray(parsed.key_points),
      decisions: toStringArray(parsed.decisions),
      action_items,
      actionItems: action_items.map((item) => item.task).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (
    isRateLimited(
      `summarize:${ip}`,
      SUMMARY_RATE_LIMIT,
      SUMMARY_RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Too many summary requests. Please retry in a minute." },
      { status: 429 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  let transcript: TranscriptInput[];
  try {
    const payload = (await req.json()) as { transcript?: TranscriptInput[] };
    transcript = payload.transcript ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const normalized = transcript
    .map((e) => ({
      sender: sanitizeInput(e.sender ?? ""),
      text: sanitizeInput(e.text ?? ""),
    }))
    .filter((e) => e.sender && e.text);

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const formattedTranscript = normalized
    .slice(0, 500)
    .map((e) => `${e.sender}: ${e.text}`)
    .join("\n");

  const groq = new Groq({ apiKey, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: SUMMARY_MODEL,
        temperature: 0.2,
        max_completion_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are an expert meeting assistant. Return ONLY valid JSON with no extra text.",
              "Respond with exactly this shape:",
              JSON.stringify({
                summary: "concise professional markdown summary (2-4 paragraphs)",
                key_points: ["bullet point 1", "bullet point 2"],
                decisions: ["decision made 1"],
                action_items: [{ task: "short task title", assignee: "name or null", due: "date string or null" }],
              }),
              "Rules:",
              "- summary: use markdown with ## sub-headings (Overview, Risks/Blockers if any)",
              "- key_points: top 3-5 discussion highlights",
              "- decisions: concrete decisions made (empty array if none)",
              "- action_items: deduplicated, concrete, actionable tasks",
            ].join(" "),
          },
          {
            role: "user",
            content: `Summarize the following meeting transcript:\n\n${formattedTranscript}`,
          },
        ],
      },
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );

    const content = completion.choices[0]?.message?.content;
    const parsed = parseJsonPayload(content);

    if (!parsed) {
      return NextResponse.json({ error: "Groq returned an invalid response" }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Groq.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "Summary generation timed out" }, { status: 504 });
    }
    if (error instanceof Groq.APIError) {
      return NextResponse.json({ error: error.message || "Groq request failed" }, { status: error.status || 502 });
    }
    console.error("API Summarize Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
