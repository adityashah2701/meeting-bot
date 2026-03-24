// components/home/features.tsx
import React from 'react';
import {
  BrainCircuit,
  CalendarDays,
  CheckSquare,
  FileText,
  Radio,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Radio,
    title: 'Real-time Transcription',
    desc: 'Every word captured live with 99% accuracy. Speaker diarization separates voices instantly across 40+ languages.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Powered Summaries',
    desc: 'LLM extracts key decisions, action items, and dates — turning hours of discussion into concise, searchable notes.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: CheckSquare,
    title: 'Action Item Tracking',
    desc: 'Tasks are automatically created from conversation context with assignees and due dates. Nothing slips through.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Users,
    title: 'Team Workspaces',
    desc: 'Invite your team, share recordings, and search across your entire organization\'s conversation history instantly.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: CalendarDays,
    title: 'Calendar Integration',
    desc: 'Sync directly with Google Calendar. Meeting join links, attendees, and reminders flow automatically.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: FileText,
    title: 'Notion Export',
    desc: 'Ship your meeting summary, transcripts, recordings, and action items directly into your Notion workspace.',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  },
];

const stats = [
  { value: '99%', label: 'Transcription accuracy' },
  { value: '40+', label: 'Languages supported' },
  { value: '<3s', label: 'Summary generation' },
  { value: '∞', label: 'Meetings archived' },
];

const steps = [
  {
    number: '01',
    title: 'Start a meeting room',
    desc: 'Click "Start Meeting" from your dashboard. An instant live room is created — no setup needed.',
    icon: Zap,
  },
  {
    number: '02',
    title: 'Talk naturally',
    desc: 'Meeting Bot listens in real-time, transcribing every speaker with diarization and timestamps.',
    icon: Radio,
  },
  {
    number: '03',
    title: 'Get your summary',
    desc: 'When the meeting ends, AI generates a structured summary with decisions, action items, and key points.',
    icon: BrainCircuit,
  },
  {
    number: '04',
    title: 'Sync everywhere',
    desc: 'Push the summary to Notion, track tasks in your dashboard, and share recordings with your team.',
    icon: Shield,
  },
];

export function Features() {
  return (
    <>
      {/* ── Stats bar ── */}
      <section className="w-full max-w-5xl mx-auto mt-24 mb-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/60">
          {stats.map((s) => (
            <div key={s.label} className="bg-card flex flex-col items-center justify-center py-8 gap-1 text-center px-4">
              <p className="text-4xl font-black tabular-nums text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="w-full max-w-6xl mx-auto mt-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Feature set
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Everything your team needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From live transcription to AI summaries and integrations — all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border ${f.border} bg-card/60 p-6 transition-all duration-300 hover:bg-card/90 hover:shadow-lg hover:-translate-y-1`}
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>

                {/* Decorative glow on hover */}
                <div className={`pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${f.bg} blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto mt-32">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            How it works
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            From meeting to insight in minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No configuration. Just start talking — Meeting Bot handles the rest.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connector line */}
          <div className="pointer-events-none absolute top-9 left-[10%] right-[10%] hidden lg:block">
            <div className="h-px w-full border-t border-dashed border-border/60" />
          </div>

          {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col gap-4">
                {/* Step badge */}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-xs font-black text-primary">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" className="w-full max-w-6xl mx-auto mt-32">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
                <Radio className="h-3.5 w-3.5 text-primary" />
                Integrations
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                Works with your existing tools
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Connect Google Calendar to auto-schedule meetings, and Notion to export summaries, transcripts, and action items after every call.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: CalendarDays, name: 'Google Calendar', desc: 'Auto-sync meeting events and attendees' },
                  { icon: FileText, name: 'Notion', desc: 'Export summaries, decisions, and recordings' },
                ].map((i) => (
                  <div key={i.name} className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <i.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.desc}</p>
                    </div>
                    <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Available
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              {/* Decorative integration illustration */}
              <div className="relative flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-lg shadow-primary/10">
                  <BrainCircuit className="h-10 w-10 text-primary" />
                </div>
                <div className="flex gap-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 shadow-md">
                    <CalendarDays className="h-7 w-7 text-red-400" />
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/10 shadow-md">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                </div>
                {/* Connector lines */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 h-8 w-px border-l border-dashed border-border/60" />
                <div className="absolute top-28 left-[calc(50%-40px)] h-px w-20 border-t border-dashed border-border/60" />
                <p className="text-xs text-muted-foreground text-center max-w-48 mt-2">
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
