import React from 'react';
import Link from 'next/link';
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Radio,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Radio,
    title: 'Real-time transcription',
    desc: '99% accuracy across 40+ languages',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BrainCircuit,
    title: 'AI-powered summaries',
    desc: 'Decisions & action items extracted instantly',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    desc: 'Collaborate and search conversation history',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Zap,
    title: 'Instant setup',
    desc: 'Start your first meeting in under 60 seconds',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Left panel ── */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border/60 p-10 lg:flex">

        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/8 blur-[80px]" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-500/5 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/4 blur-[60px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, oklch(1 0 0 / 6%) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 6%) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* ── Top: Logo ── */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Meeting Bot</span>
          </Link>
        </div>

        {/* ── Middle: Headline + Features ── */}
        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              AI-Powered Intelligence
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground xl:text-5xl">
              Every meeting,{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-400">
                perfectly captured.
              </span>
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Real-time transcription, AI summaries, action items, and team collaboration — all in one workspace.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.bg}`}>
                  <f.icon className={`h-4.5 w-4.5 ${f.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Trust strip ── */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {[
            { icon: CheckCircle2, text: 'No credit card', color: 'text-emerald-400' },
            { icon: CheckCircle2, text: 'Free to start', color: 'text-emerald-400' },
            { icon: CheckCircle2, text: 'SOC 2 Compliant', color: 'text-emerald-400' },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: Clerk form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-6 lg:p-10">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-bold text-foreground">Meeting Bot</span>
        </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
