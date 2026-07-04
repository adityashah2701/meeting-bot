# Meeting Room — Full Redesign

## Context

The live meeting room (`features/meeting/components/meeting-room-page.tsx` + its children) was built feature-by-feature — recording, transcription, whiteboard, reactions, settings — and every new capability got bolted on as one more header pill, drawer entry, or tab. The result works, but reads as a prototype: a crowded header, a junk-drawer "More" panel, a rigid tabbed sidebar, and a floating control bar with no visual hierarchy. Nothing about it signals "premium desktop software."

This plan redesigns the room from first principles: a calm shell where the meeting stage is always dominant, a single adaptive workspace panel replaces the tab bar, controls are grouped by intent, and AI (live captions, summaries, action items) surfaces in-context instead of hiding behind a button in a tab. Existing Convex queries/mutations, `useWebrtc`, `useTranscription`, `useTranscriptSync`, and the whiteboard/reactions data layer are all reused as-is — this is a UI/layout/interaction rebuild, not a data-layer change.

## UX audit of the current implementation (grounded in code)

**Header (`meeting-room-page.tsx:748-1036`)**
1. Seven+ elements compete in one bar: title, status pill, record button, transcription pill, mic-blocked pill, clock pill, panel toggle, "More" drawer trigger — no hierarchy, everything the same visual weight.
2. Recording — a primary, state-changing action — lives in the header, disconnected from every other primary control (mic/cam/share) which live in the floating bottom bar.
3. The "More" drawer (`View Options`) is a junk drawer: focus mode, compact rail, floating transcript, whiteboard, pin-participant (a raw `<select>`, the only non-shadcn control in the whole UI), and "Meeting Settings" all dumped into one flat list with no grouping.
4. Opening Meeting Settings from inside the View Options drawer requires closing that drawer and opening a *second* modal via a `setTimeout(0)` hack (`meeting-room-page.tsx:995-999`) — a visible workaround for a bad IA, not a real transition.
5. Banners (permission-denied, meeting-locked, waiting-room, removed/rejected) are each styled slightly differently (different colors, radii, paddings) with no shared "system notice" component.

**Right panel (`meeting-side-panel.tsx`)**
6. Four flat top tabs (Chat/AI/People/Transcript) with no badges — an unread message, a pending waiting-room admit, or a finished summary all fail to surface unless the user manually clicks through every tab.
7. Chat messages and transcript lines use the *identical* visual pattern (bordered box → sender name → text) — nothing distinguishes "someone typed this" from "someone said this."
8. Chat has no own-message/other-message distinction, no avatars, no timestamps — reads like a raw log, not a product chat surface.
9. Panel is a fixed 360px, not resizable, and "collapse" is a width+opacity CSS transition on a wrapper div rather than a real, fluid slide-and-reflow.
10. AI lives entirely behind a manual "Generate summary" button inside one tab — for an "AI-first" product, nothing about transcription progress, speaker detection, or action items is visible unless you're already on that tab.

**Stage / video (`participant-grid.tsx`, `video-tile.tsx`)**
11. 2-participant layout is a plain 50/50 `grid-cols-2` split — every mainstream product (Zoom/Meet/Teams) instead gives one clear primary (whoever's speaking) with the other docked smaller; the current layout has no concept of "primary speaker" at all outside of `focusMode`, which is a manual toggle, not automatic.
12. No dedicated self-preview: the local tile is just "first in the array," so your own face competes for equal visual weight with everyone else instead of a small anchored corner PiP (the near-universal pattern in every product cited).
13. Active-speaker cue is a thin 2px ring — easy to miss in a busy grid, and it's the *only* signal (no glow, no name-bar emphasis, no motion).
14. Screen-share thumbnail rail is a fixed 48/32-width vertical strip — with more than ~5 participants it becomes a cramped scrolling column squeezed beside the presentation instead of a horizontal filmstrip that scales naturally.
15. Single-participant view centers a `max-w-3xl` tile in the middle of the screen, leaving large dead space on both sides with nothing done to make that space feel intentional.
16. `.meeting-reaction-float` / `.meeting-reaction-bubble` are referenced in `meeting-reactions-overlay.tsx` but never defined in `globals.css` — the reactions feature is currently visually broken (no float/pop animation actually renders).
17. The whiteboard "stage" mode drops a hard `bg-white` rectangle into an otherwise all-dark UI (`meeting-room-page.tsx:1091`) — a jarring light flash that breaks dark-first consistency.

**Controls (`meeting-controls.tsx`)**
18. Mic/camera use `variant="destructive"` (bright red) purely for the "muted/off" state — a completely normal, common state — which visually screams "error" for something that isn't. Red should be reserved for actually destructive/risky actions (Leave/End).
19. Reaction button is styled at the same size/weight as the core call controls (mic/camera/share) despite being a secondary, occasional action.
20. No keyboard-shortcut affordance anywhere — no shortcuts button, no hint UI — despite being explicitly called out as an expected secondary action.
21. Settings/More/Shortcuts (the requested secondary-action cluster) don't exist as a cluster at all today; "Settings" only exists buried in the header drawer.

**Transcript surfaces**
22. Transcript data is rendered in *three* independent places (header "Transcribing" pill, side-panel Transcript tab, an optional floating overlay toggled from the drawer) with three different visual treatments and no relationship between them.

**System / spacing**
23. Padding values are ad hoc across the file (`p-3 lg:p-5`, `px-4 py-2`, `px-2.5 py-1`, `px-3 py-2.5`, `gap-2.5`) with no consistent spacing scale, so density varies unpredictably between header, body, and panel.
24. There is no defined motion system — transitions exist ad hoc (`transition-all duration-300`, `transition-opacity`) with no shared timing/easing tokens, so state changes feel inconsistent.
25. The dark theme (`app/globals.css:86-119`) is already true-black/high-contrast — a good foundation — but nothing in the current layout takes advantage of it for depth (no consistent elevation/shadow scale between stage, panel, and floating elements).

## Redesign strategy

Replace the "header + flex body + floating bar" assembly with a deliberate **app shell** of four zones that read as one connected system instead of stitched panels:

1. **Slim top bar** — identity only: meeting title, live/duration, participant-count/avatars, one panel toggle. No actions that change call state.
2. **Stage** (center, always dominant) — adaptive participant layout with automatic primary-speaker emphasis, anchored self-preview PiP, screen-share/whiteboard as first-class stage content, live caption strip that appears only while someone is speaking.
3. **Workspace panel** (right, resizable/collapsible) — one panel, icon-rail navigation (not top tabs) between AI / Chat / Transcript / Notes / People, cross-fading content, badges on the rail icons for unread/pending state. This absorbs Meeting Settings as a proper panel section (not a second disconnected modal) and folds "Notes" in as a new lightweight section.
4. **Command bar** (bottom, floating) — grouped clusters with real hierarchy: primary (mic/camera/share), recording moved in as its own toggle within the primary cluster, secondary (react/settings/shortcuts under one "more" affordance), destructive (leave/end) visually separated and calmer (outline, not solid red, until pressed).

AI becomes ambient rather than tab-locked: a small always-visible status chip in the top bar reflects transcribing/summarizing state, a live caption strip surfaces the current/last spoken line over the stage, and finished summaries/action items push a brief toast plus a badge on the workspace panel's AI rail icon — so the user is never forced to go looking for it.

One shared "system notice" banner component replaces the four ad hoc banner variants (locked / waiting / permission-denied / removed). One spacing scale (4/8/12/16/24/32) and one motion timing set (150ms ease-out for panel/content swaps, 200ms for tile layout changes, no motion on anything that isn't a state change) apply everywhere.

## Layout plan

```
┌───────────────────────────────────────────────────────────────────────┬────────────┐
│  Meeting title · ● Live 12:34 · [avatars ●●●+2]      [AI: listening] [▸]│  ┌──────┐ │
├───────────────────────────────────────────────────────────────────────┤  │ AI   │ │
│                                                                        │  │ Chat │ │
│                                                                        │  │ ⟡    │ │
│                         STAGE (adaptive)                              │  │ Tsc  │ │
│        — 1 participant: large centered tile, ambient framing          │  │ Notes│ │
│        — 2: primary speaker large + secondary docked lower-right      │  │ Ppl  │ │
│        — 3-6: balanced grid, active speaker glow                      │  └──────┘ │
│        — screen share/whiteboard: fills stage, filmstrip along bottom │            │
│                                                        [self PiP] ▢    │  Chat pane │
│                                                                        │  content   │
│              [live caption strip — only while active] ▁▁▁▁▁▁▁▁       │            │
├───────────────────────────────────────────────────────────────────────┴────────────┤
│         ( mic  cam  share | rec )   ( react )   ( leave )     ( ⋯ more )            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- **Top bar** owns identity + passive AI status only — nothing here changes call state, so it never competes with the command bar.
- **Stage** always gets remaining space; self-preview is a fixed-position PiP (bottom-right of stage, draggable-free, always on top) instead of "just another tile," matching Meet/Zoom/Teams convention and freeing the main grid from needing to special-case the local participant.
- **Workspace panel** defaults collapsed to a 56px icon rail (so it's *available but visually secondary*, matching the "everything else stays available but stays secondary" brief); expanding reveals a resizable 320-420px content pane. A drag handle on its left edge lets it resize; the same toggle in the top bar collapses/expands it.
- **Command bar** stays floating/centered like today (that part works), but internally reorganized into three clusters separated by hairline dividers: primary call controls (mic/cam/share/record), secondary (react, and a single "⋯ more" that holds Settings + Shortcuts + View options merged into one contextual menu instead of a full drawer), and Leave/End standing alone at the far right so it's visually distinct without dominating.
- **Live caption strip** sits just above the command bar, shows the most recent 1-2 lines, fades in only while actively transcribing, and is the single source of "live transcript" — clicking it expands the Transcript section in the workspace panel instead of duplicating the data in a third floating widget.

## Implementation plan (files)

**New components** (under `features/meeting/components/` unless noted):
- `room-shell.tsx` — the four-zone layout container replacing the current top-level markup in `meeting-room-page.tsx`.
- `room-top-bar.tsx` — slim identity bar (title, live/duration, participant avatars, AI status chip, panel toggle).
- `system-banner.tsx` — one shared banner component (variants: locked / waiting / blocked / removed-rejected) replacing the 4 ad hoc banner blocks.
- `workspace-panel.tsx` — icon-rail + resizable content pane; hosts Chat / AI / Transcript / Notes / People sections. Rebuilds the presentation layer of `meeting-side-panel.tsx`; the existing Convex queries/mutations and handler logic in that file are preserved and moved into this component (or a `use-workspace-panel.ts` hook) rather than rewritten.
- `workspace-panel/chat-section.tsx`, `ai-section.tsx`, `transcript-section.tsx`, `notes-section.tsx`, `people-section.tsx` — split out of the current single 1030-line file for maintainability, each keeping its existing data logic.
- `meeting-settings-panel.tsx` — Settings + Invite content, now a section reachable from the command bar "⋯ more" menu and rendered inline in the workspace panel (or as a single focused dialog opened directly, no more open-drawer-then-open-dialog hop).
- `live-caption-strip.tsx` — replaces the floating-transcript overlay (`showFloatingTranscript`/`transcriptDock` state and JSX in `meeting-room-page.tsx:1195-1214`) with the always-consistent caption strip above the command bar.
- `command-bar.tsx` — replaces `features/webrtc/components/meeting-controls.tsx` internals with clustered layout (primary/secondary/destructive groups); keeps `MicToggle`/`CameraToggle`/`ScreenShareButton` but restyles the muted/off state off `destructive` variant onto a neutral "active-state" treatment, reserving red for Leave/End only.
- `more-menu.tsx` — dropdown/popover consolidating Focus mode, Compact rail, Whiteboard toggle, Pin participant (rebuilt as a proper `Select`/command-palette-style list instead of the raw `<select>`), Meeting Settings, and Shortcuts — replaces the `Drawer`-based "View Options" in `meeting-room-page.tsx:836-1015`.
- `shortcuts-dialog.tsx` — new, simple reference dialog for keyboard shortcuts (secondary action explicitly requested).

**Modified:**
- `features/webrtc/components/participant-grid.tsx` — rewrite layout logic: automatic primary/secondary asymmetric layout for 2 participants, self-view extracted into an anchored PiP rendered by the shell (not inside the grid's participant list), horizontal filmstrip (not vertical rail) for screen-share/many-participant case.
- `features/webrtc/components/video-tile.tsx` — active-speaker treatment upgraded from thin ring to glow + subtle name-bar emphasis; new `isPip` density variant for the self-preview corner tile.
- `features/meeting/components/meeting-whiteboard.tsx` (wrapper only, in `room-shell.tsx`'s stage rendering) — swap the hard `bg-white` container for a dark-chrome frame around the canvas so it doesn't break dark-first consistency.
- `features/meeting/components/meeting-reactions-overlay.tsx` / `app/globals.css` — add the missing `@keyframes` for `.meeting-reaction-float` / `.meeting-reaction-bubble` so reactions actually animate.
- `app/globals.css` — add a small motion/spacing token comment block (durations/easings) used consistently by the new components; no change to existing landing-page utilities.
- `features/meeting/components/meeting-room-page.tsx` — becomes a thin data-wiring component: keeps all Convex queries/mutations, `useWebrtc`/`useTranscription`/`useTranscriptSync`, and the recording/summary/leave/end handlers exactly as they are today, but renders `<RoomShell>` instead of the current inline header/body/panel/floating-bar JSX.

**Not changed:** Convex schema/functions, `use-webrtc.ts` signaling logic, `use-transcription.ts`/`use-transcript-sync.ts`, `camera-track-manager.ts`, recording capture/upload pipeline, whiteboard sync logic, `meeting-service.ts` bindings — this is purely the presentation layer.

## Motion principles (applied via the new components)

- Panel expand/collapse and content-section swaps: 150ms ease-out opacity+transform, no bounce.
- Stage layout changes (participant joins/leaves, screen-share starts/stops): 200ms ease-in-out on tile position/size.
- Recording start: a brief pulse on the record indicator only (not the whole bar).
- Nothing animates on hover beyond existing shadcn button states — no gimmick motion.

## Verification

- `npm run dev` (or existing dev script) and open a meeting room with: 1 participant, 2 participants, 4+ participants, screen-share active, whiteboard open, workspace panel collapsed/expanded/resized, recording on, and mic-permission-denied — confirm no layout jank/dead space in any state.
- Manually confirm reactions now visibly float/pop (previously silently broken).
- Confirm dark mode throughout, including the whiteboard frame, has no unstyled white flashes.
- Run `npm run lint`/`tsc` (whatever this repo's existing check scripts are) after the rebuild to catch type errors from the props reshuffle between `meeting-room-page.tsx` and the new shell components.
