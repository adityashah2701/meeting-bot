You are working on a Next.js 16 + React 19 + Convex + Clerk + WebRTC meeting platform.

The current implementation is functional but has UI inconsistencies, UX issues in meeting room, and missing polish in workflows.

Your task is to refactor, enhance UI/UX, improve meeting room behavior, and integrate Groq SDK properly.

🧩 1. Install & Integrate Groq SDK (IMPORTANT)
Install package:
npm install groq-sdk
Refactor /api/summarize/route.ts:
Replace raw fetch/OpenAI-compatible call with official Groq SDK
Use environment variable:
GROQ_API_KEY=
Implementation requirements:
Use groq.chat.completions.create
Model: llama3-70b-8192
Add:
streaming support (optional but preferred)
better prompt formatting
error handling with proper status codes
timeout handling
🎨 2. Fix Design System Inconsistency (CRITICAL)
Problem:

Auth + onboarding use old tokens (bg-surface, etc.)
Main app uses Tailwind + CSS variables

Fix:
Remove ALL old token usage
Standardize everything to:
bg-background
bg-card
text-foreground
text-muted-foreground
border-border
Use existing shadcn components properly wherever possible.
Do NOT remove shadcn from the app.
Do NOT replace shadcn primitives with custom ad-hoc markup if an existing primitive already fits.
Prefer composing from the existing `components/ui/*` layer first.
Replace custom UI only when it is duplicating an existing shadcn primitive.
Preferred components:
Card
Dialog
Tabs
ScrollArea
Avatar
Button
Sheet
🎥 3. Meeting Room UI Fixes (HIGH PRIORITY)
❌ Current Issues:
Controls shift downward when content grows
Meeting area becomes scrollable
Layout breaks with participants
Color scheme mismatch
✅ Required Fixes:
3.1 Layout Structure (NO SCROLL BREAK)

Refactor meeting room layout:

<div className="h-screen flex flex-col">
  <Header />

  <div className="flex-1 overflow-hidden flex">
    <ParticipantGrid />   // NO scroll on full page
    <MeetingSidePanel />  // Scrollable internally
  </div>

  <MeetingControls />     // ALWAYS fixed
</div>
Rules:
❌ No page-level scroll
✅ Only side panel scrolls (ScrollArea)
✅ Participant grid is responsive and contained
3.2 Fix Controls Position
Controls should be:
fixed bottom center
floating with slight blur background
not pushed by content

Use:

className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"

Wrap with:

Card or div with:
bg-background/80
backdrop-blur
border
3.3 Fix Color Mismatch
Meeting room must follow the default shadcn theme used by the dashboard.
Do not introduce a special meeting-only color palette.
Do not add extra custom colors just for the meeting screen.
Keep color usage simple and token-based.
Use:
bg-background
bg-card
text-foreground
text-muted-foreground
border-border
Ensure consistency with global CSS tokens
3.4 Avatar for Camera Off (IMPORTANT UX)

When isCameraEnabled === false:

Replace video tile with:

<Avatar>
  <AvatarImage src={imageUrl} />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>

Enhancements:

Show:
user initials fallback
mic status icon
Add subtle animation/pulse when speaking (optional)
3.5 Participant Grid Improvement
Use responsive grid:
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
Maintain aspect ratio using:
<AspectRatio ratio={16 / 9}>
Avoid layout jumps
🧠 4. Improve Meeting UX Flow
Fix Meeting Lifecycle Issues
Problem:
Scheduled meetings don’t auto-start
Joining doesn’t update state correctly
Fix:
On participants.join:
If meeting is scheduled AND time <= now:
set:
status = active
startedAt = now
Add Auto Summary Trigger

Instead of manual-only:

Auto trigger summary when:
meeting ends
Debounce transcript aggregation
Add Action Item Extraction (NEW FEATURE)

After summary:

Extract tasks
Store in tasks table
⚡ 5. Performance & Optimization
5.1 WebRTC Optimization
Avoid re-creating peer connections unnecessarily
Memoize participants
Clean up signals aggressively
5.2 Transcription Optimization
Batch transcript writes instead of per-line mutation
Debounce API calls
5.3 Convex Query Optimization
Scope dashboard queries to org properly (currently not fully scoped)
Avoid over-fetching transcript data
🧭 6. Workflow Improvements (IMPORTANT)
Improve User Flow:
Current:

Login → Org → Dashboard → Meetings → Create → Join

Improve to:
Add Quick Actions in Dashboard:
Start Instant Meeting
Schedule Meeting (Dialog)
Meeting Creation (Already good but refine)
Keep dialog-based creation
Improve UI:
Tabs: Instant / Schedule
Better defaults
Inline validation
Add Empty States

Use shadcn Empty or custom:

No meetings
No tasks
No transcripts
🧱 7. Component Refactor Rules
Keep ALL UI inside features/*
No UI logic in app/
Break into:
components/
hooks/
services/
🧼 8. Cleanups
Do NOT remove shadcn components from /components/ui as part of this refactor.
Keep the existing shadcn component inventory intact unless there is a separate cleanup task.
Focus on using the existing shadcn primitives correctly and consistently.
Remove duplicate logic
Fix route inconsistencies:
ended meeting → /details
✨ 9. Bonus Enhancements (If time permits)
Add:
speaking indicator (audio activity hook already exists)
pinned participant
screen share focus mode
keyboard shortcuts (mute, camera)
✅ Expected Output
Clean, consistent UI
Fully fixed meeting room layout
Stable controls (no shifting)
Avatar fallback working
Groq SDK integrated properly
Better UX across dashboard + meetings
Improved performance
⚠️ Constraints
MUST use shadcn components wherever possible
DO NOT remove existing shadcn components just to simplify the codebase
DO NOT create a custom meeting-room color system
DO NOT introduce new UI libraries
DO NOT break existing Convex APIs unless necessary
Maintain feature-based architecture
