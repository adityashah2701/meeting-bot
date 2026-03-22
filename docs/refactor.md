# 🚀 Meeting Bot — Transcription + AI Summary Optimization

You are working on a **Next.js + Convex + WebRTC meeting platform** using Groq for transcription (Whisper) and summarization.

The current system works but has issues with:
- Hinglish (Hindi + English) transcription accuracy
- inefficient transcript handling
- manual summarization
- lack of structured outputs

Your task is to **optimize transcription and AI summary into a production-ready pipeline**.

---

# 🎙️ 1. TRANSCRIPTION PIPELINE

## Goals
- Improve Hinglish accuracy
- Reduce hallucination
- Optimize performance

---

## 1.1 Add Transcription Buffer

Do NOT send transcripts line-by-line.

Implement batching:

```
buffer = []

onTranscript(text):
  buffer.push(text)

every 5–10 seconds:
  sendBatch(buffer)
  buffer = []
```

---

## 1.2 Add AI Cleanup Layer (MANDATORY)

After receiving transcription from Groq Whisper:

- Pass text through Groq LLM for correction

Prompt:

```
Fix the following transcription which may contain mixed Hindi and English (Hinglish).
Do not change meaning.
Do not hallucinate.
Return clean and accurate text.
```

---

## 1.3 Improve Hinglish Handling

- Default transcription mode: `auto`
- If instability detected:
  - fallback to Hindi-leaning processing
- Normalize output:
  - preserve English terms (technical words, names)
  - correct Hindi words properly

---

## 1.4 Add Confidence Filtering

- Drop or flag low-confidence segments
- Avoid saving noisy transcripts

---

## 1.5 Add Metadata

Each transcript must include:

```
{
  meetingId,
  speakerId,
  speakerName,
  text,
  timestamp
}
```

---

# ⚡ 2. PERFORMANCE OPTIMIZATION

## 2.1 Batch Convex Writes
- Combine transcript inserts
- Avoid high-frequency mutations

## 2.2 Debounce Transcription Calls
- Prevent API spam

## 2.3 Avoid Reprocessing
- Do not send duplicate audio chunks

---

# 🧾 3. AI SUMMARY SYSTEM

## Goals
- Automate summaries
- Reduce cost
- Improve structure

---

## 3.1 Incremental Summarization (MANDATORY)

Do NOT send full transcript every time.

Instead:

```
chunkSummary = summarize(last_5_minutes)
store(chunkSummary)
```

---

## 3.2 Create summary_chunks Table

```
{
  meetingId,
  chunkIndex,
  summary,
  createdAt
}
```

---

## 3.3 Final Summary Merge

On meeting end:

```
finalSummary = merge(all_chunk_summaries)
```

---

## 3.4 Structured Output (MANDATORY)

Return JSON:

```
{
  "summary": "...",
  "key_points": [],
  "decisions": [],
  "action_items": [
    {
      "task": "...",
      "assignee": "...",
      "due": null
    }
  ]
}
```

---

## 3.5 Auto Summary Trigger

Trigger:
- every 5–10 minutes
- when meeting ends

Allow manual trigger as fallback.

---

# 🧩 4. ACTION ITEM EXTRACTION

After summary:

```
tasks.create({
  meetingId,
  title,
  assignee,
  source: "ai"
})
```

Enhance tasks:
- add `status: open | completed`
- add edit/update capability
- allow assignment

---

# 🧠 5. MEETING LIFECYCLE FIX

Fix scheduled → active transition:

```
if (meeting.status === "scheduled" && scheduledFor <= now) {
  status = "active"
  startedAt = now
}
```

---

# ⚡ 6. UX REQUIREMENTS

- Show live transcription (real-time)
- Show cleaned transcript (final)
- Show AI processing state:
  - "Generating summary..."
- Allow:
  - manual summary regeneration
  - transcript editing

---

# 🔒 7. SAFETY

- Add user consent before transcription
- Allow transcript correction
- Do not assume AI output is always correct

---

# ⚠️ CONSTRAINTS

- Do NOT break existing Convex APIs unnecessarily
- Maintain feature-based architecture
- Keep system modular and scalable

---

# ✅ EXPECTED OUTPUT

- Improved Hinglish transcription accuracy
- Reduced hallucination via AI cleanup
- Efficient batching and performance
- Automated structured summaries
- Action items extracted automatically
- Production-ready pipeline