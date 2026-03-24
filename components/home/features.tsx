"use client";

import React from "react";
import {
  BrainCircuit,
  CalendarDays,
  CheckSquare,
  FileText,
  Radio,
  Shield,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Radio,
    title: "Real-time Transcription",
    desc: "Every word captured live with speaker diarization across 40+ languages. Instant, searchable, and accurate.",
    accent: "emerald",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Summaries",
    desc: "LLM extracts key decisions, action items, and dates — hours of discussion into concise, structured notes.",
    accent: "violet",
  },
  {
    icon: CheckSquare,
    title: "Action Item Tracking",
    desc: "Tasks auto-created from context with assignees and due dates. Nothing slips through the cracks.",
    accent: "amber",
  },
  {
    icon: Users,
    title: "Team Workspaces",
    desc: "Invite your team, share recordings, and search your organization's entire conversation history.",
    accent: "blue",
  },
  {
    icon: CalendarDays,
    title: "Calendar Integration",
    desc: "Sync with Google Calendar. Meeting links, attendees, and reminders flow in automatically.",
    accent: "rose",
  },
  {
    icon: FileText,
    title: "Notion Export",
    desc: "Ship summaries, transcripts, recordings, and action items directly into your Notion workspace.",
    accent: "slate",
  },
];

const accentMap: Record<string, { icon: string; bg: string; border: string; glow: string }> = {
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/[0.12]", glow: "group-hover:shadow-emerald-500/[0.06]" },
  violet: { icon: "text-violet-400", bg: "bg-violet-500/[0.08]", border: "border-violet-500/[0.12]", glow: "group-hover:shadow-violet-500/[0.06]" },
  amber: { icon: "text-amber-400", bg: "bg-amber-500/[0.08]", border: "border-amber-500/[0.12]", glow: "group-hover:shadow-amber-500/[0.06]" },
  blue: { icon: "text-blue-400", bg: "bg-blue-500/[0.08]", border: "border-blue-500/[0.12]", glow: "group-hover:shadow-blue-500/[0.06]" },
  rose: { icon: "text-rose-400", bg: "bg-rose-500/[0.08]", border: "border-rose-500/[0.12]", glow: "group-hover:shadow-rose-500/[0.06]" },
  slate: { icon: "text-slate-400", bg: "bg-slate-500/[0.08]", border: "border-slate-500/[0.12]", glow: "group-hover:shadow-slate-500/[0.06]" },
};

const stats = [
  { value: "99%", label: "Transcription accuracy" },
  { value: "40+", label: "Languages supported" },
  { value: "<3s", label: "Summary generation" },
  { value: "∞", label: "Meetings archived" },
];

const steps = [
  {
    number: "01",
    title: "Start a meeting room",
    desc: 'Click "Start Meeting" from your dashboard. An instant live room — no setup needed.',
    icon: Zap,
  },
  {
    number: "02",
    title: "Talk naturally",
    desc: "Meeting Bot transcribes every speaker in real-time with timestamps and diarization.",
    icon: Radio,
  },
  {
    number: "03",
    title: "Get your summary",
    desc: "AI generates a structured summary with decisions, action items, and key points.",
    icon: BrainCircuit,
  },
  {
    number: "04",
    title: "Sync everywhere",
    desc: "Push summaries to Notion, track tasks in your dashboard, and share with your team.",
    icon: Shield,
  },
];

export function Features() {
  return (
    <>
      {/* ── Stats bar ── */}
      <section className="w-full max-w-[960px] mx-auto mt-28">
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-white/[0.06] bg-[oklch(0.16_0.008_85)] overflow-hidden divide-x divide-white/[0.04]">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-8 gap-1 text-center px-4">
              <p className="text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight text-foreground">{s.value}</p>
              <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-[0.06em]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="w-full max-w-[1200px] mx-auto mt-32 px-6 lg:px-0">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mb-5">
            <Zap className="h-3 w-3 text-primary" />
            Feature set
          </div>
          <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] text-foreground mb-4 leading-[1.15]">
            Everything your team needs
          </h2>
          <p className="text-[1.05rem] text-muted-foreground/60 max-w-[480px] mx-auto leading-relaxed">
            From live transcription to AI summaries and integrations — all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            const colors = accentMap[f.accent];
            // Bento layout: row1 = 7+5, row2 = 4+4+4, row3 = 5+7
            const spanClass =
              i === 0 ? "md:col-span-7" :
              i === 1 ? "md:col-span-5" :
              i === 2 ? "md:col-span-4" :
              i === 3 ? "md:col-span-4" :
              i === 4 ? "md:col-span-4" :
              "md:col-span-12";
            // Last card spans full width — make it horizontal
            const isWide = i === 5;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-[oklch(0.16_0.008_85)] transition-all duration-300 hover:bg-[oklch(0.18_0.008_85)] hover:shadow-[0_8px_40px_-12px] ${colors.glow} hover:-translate-y-0.5 ${spanClass} ${isWide ? "p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5" : "p-6"}`}
              >
                <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${isWide ? "" : "mb-5"} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-1.5 tracking-[-0.01em]">{f.title}</h3>
                  <p className={`text-[13px] text-muted-foreground/60 leading-[1.65] ${isWide ? "max-w-md" : ""}`}>{f.desc}</p>
                </div>

                {/* Corner glow on hover */}
                <div className={`pointer-events-none absolute -right-8 -bottom-8 h-28 w-28 rounded-full ${colors.bg} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="w-full max-w-[1200px] mx-auto mt-36 px-6 lg:px-0">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mb-5">
            <CheckSquare className="h-3 w-3 text-primary" />
            How it works
          </div>
          <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] text-foreground mb-4 leading-[1.15]">
            From meeting to insight in minutes
          </h2>
          <p className="text-[1.05rem] text-muted-foreground/60 max-w-[480px] mx-auto leading-relaxed">
            No configuration. Just start talking — Meeting Bot handles the rest.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Connector line — desktop only */}
          <div className="pointer-events-none absolute top-[22px] left-[12%] right-[12%] hidden lg:block">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {steps.map((step) => (
              <div key={step.number} className="group relative flex flex-col gap-4">
                {/* Step number */}
                <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] text-[12px] font-extrabold text-primary tracking-wide transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/[0.14] group-hover:shadow-[0_0_16px_-4px] group-hover:shadow-primary/20">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-[15px] tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground/55 leading-[1.65]">{step.desc}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" className="w-full max-w-[1200px] mx-auto mt-36 px-6 lg:px-0">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[oklch(0.16_0.008_85)] p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mb-5">
                <Radio className="h-3 w-3 text-primary" />
                Integrations
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-foreground mb-4 leading-[1.2]">
                Works with your existing tools
              </h2>
              <p className="text-muted-foreground/55 leading-relaxed mb-7 text-[15px]">
                Connect Google Calendar to auto-schedule meetings, and Notion to export summaries, transcripts, and action items.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: CalendarDays, name: "Google Calendar", desc: "Auto-sync meeting events and attendees" },
                  { icon: FileText, name: "Notion", desc: "Export summaries, decisions, and recordings" },
                ].map((i) => (
                  <div key={i.name} className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.04]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] ring-1 ring-primary/15 transition-all duration-300 group-hover:ring-primary/30">
                      <i.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground">{i.name}</p>
                      <p className="text-[12px] text-muted-foreground/50">{i.desc}</p>
                    </div>
                    <div className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 tracking-wide">
                      Available
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden md:flex items-center justify-center">
              {/* Decorative integration illustration */}
              <div className="relative flex flex-col items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.06] shadow-[0_8px_32px_-8px] shadow-primary/10">
                  <BrainCircuit className="h-10 w-10 text-primary" />
                </div>
                {/* Connector */}
                <div className="h-6 w-px bg-gradient-to-b from-primary/20 to-transparent" />
                <div className="flex gap-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-rose-500/15 bg-rose-500/[0.06] shadow-lg shadow-rose-500/5">
                    <CalendarDays className="h-7 w-7 text-rose-400" />
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-500/15 bg-slate-500/[0.06] shadow-lg shadow-slate-500/5">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground/40 text-center max-w-[200px] leading-relaxed">
                  Meeting Bot sits at the center of your workflow, syncing with your tools automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
