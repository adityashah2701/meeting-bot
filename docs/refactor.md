# 🚀 Meeting Bot — Transcription & AI Summary Optimization Prompt

You are working on a **Next.js + Convex + WebRTC meeting platform**.

The current implementation has:
- browser-based SpeechRecognition (local only)
- manual AI summary trigger
- no batching or pipeline
- no structured output
- no speaker-aware processing

Your task is to **redesign transcription and AI summarization into a scalable, production-grade pipeline**.

---

# 🧠 1. Core Principle

Follow this architecture:

Audio → Transcription (STT) → Processing → AI Summary (LLM)

Do NOT tightly couple these steps.

---

# 🎙️ 2. Transcription System (Redesign)

## 2.1 Hybrid Model

Implement a 2-layer system:

### Layer 1 — Real-time (Frontend)
- Use browser SpeechRecognition
- Purpose:
  - Live captions
  - Instant feedback

### Layer 2 — Backend (Accurate)
- Prepare abstraction for external STT (future-ready)
- Accept audio/text chunks for processing

---

## 2.2 Chunk-Based Processing (MANDATORY)

DO NOT send transcript line-by-line.

Instead:

- Buffer transcript in memory
- Flush every:
  - 5–10 seconds OR
  - sentence completion

Example logic:


buffer = []

onFinalTranscript(text):
buffer.push(text)

every 5 seconds:
sendBatch(buffer)
buffer = []


---

## 2.3 Transcript Schema (IMPORTANT)

Ensure each transcript includes:


{
meetingId,
speakerId,
speakerName,
text,
timestamp,
confidence (optional)
}


---

## 2.4 Speaker Awareness (Future Ready)

Design system to support:
- speaker diarization
- multiple speakers

Even if initially mocked.

---

# ⚡ 3. Real-Time Pipeline

Process data in parallel:

Audio
  → STT
    → Live UI captions
    → Buffer storage
    → Background AI trigger

DO NOT block UI for AI processing.

---

# 🧾 4. AI Summary System (Redesign)

## 4.1 Incremental Summarization (CRITICAL)

DO NOT send full transcript every time.

Instead:

- Split transcript into chunks
- Summarize each chunk
- Merge summaries later

Example:


chunkSummary = summarize(last_5_minutes)
store(chunkSummary)

finalSummary = merge(all_chunk_summaries)


---

## 4.2 Structured Output (MANDATORY)

LLM must return JSON:


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


---

## 4.3 Auto Summary Trigger

Trigger summary:
- every 5–10 minutes (background)
- when meeting ends

Also allow manual trigger.

---

# 🧩 5. Action Item Extraction

After summary:

- Extract action items
- Store in `tasks` table


tasks.create({
meetingId,
title,
assignee,
source: "ai"
})


---

# ⚡ 6. Performance Optimization

## MUST IMPLEMENT:

### 6.1 Debounce AI Calls
- Never call AI per transcript line

### 6.2 Batch Database Writes
- Combine transcript inserts

### 6.3 Avoid Reprocessing
- Cache chunk summaries

---

# 🧱 7. Data Model Enhancements

Add new table:

## summary_chunks


{
meetingId,
chunkIndex,
summary,
createdAt
}


---

# 🔄 8. Final Pipeline Flow

User speaks
  ↓
Browser STT (real-time captions)
  ↓
Buffered transcript
  ↓
Batch saved to Convex
  ↓
Background AI summarization (chunked)
  ↓
Final summary on meeting end
  ↓
Action items extracted → stored

---

# 🧪 9. Future-Ready Design

Ensure system can later integrate:

- Whisper / Deepgram / AssemblyAI
- full meeting audio processing
- multi-speaker diarization

Keep STT layer abstracted.

---

# 🎯 10. UX Requirements

- Show:
  - live captions (interim)
  - finalized transcript
- Show loading states:
  - “AI is generating summary…”
- Allow:
  - regenerate summary
  - edit transcript

---

# 🔒 11. Safety & Practical Notes

- Add transcription consent notice
- Allow transcript correction
- Do not assume AI output is always correct

---

# ⚠️ Constraints

- Do NOT break existing Convex APIs unnecessarily
- Maintain feature-based architecture
- Keep system modular and extensible

---

# ✅ Expected Outcome

- Scalable transcription pipeline
- Efficient AI summarization (chunked, not brute force)
- Structured outputs (summary + action items)
- Optimized performance
- Production-ready architecture