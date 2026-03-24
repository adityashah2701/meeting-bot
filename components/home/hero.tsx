// components/home/hero.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Radio, Sparkles, Zap } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative w-full max-w-6xl mx-auto text-center">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/8 blur-[120px]" />
      <div className="pointer-events-none absolute top-20 left-1/4 h-48 w-48 rounded-full bg-blue-500/6 blur-[80px]" />
      <div className="pointer-events-none absolute top-20 right-1/4 h-48 w-48 rounded-full bg-violet-500/6 blur-[80px]" />

      <div className="relative">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Meeting Intelligence
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 leading-[1.05] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
          Every meeting,{' '}
          <br className="hidden md:block" />
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-primary/80 to-blue-400">
              perfectly captured.
            </span>
          </span>
        </h1>

        {/* Sub */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          Real-time transcription, AI-generated summaries, action items, and team collaboration —
          all in one workspace. No more lost decisions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <Button asChild size="lg" className="w-full sm:w-auto h-13 px-8 text-base gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
            <Link href="/sign-up">
              Start for free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-13 px-8 text-base gap-2 hover:-translate-y-0.5 transition-all">
            <Link href="#how-it-works">
              See how it works
            </Link>
          </Button>
        </div>

        {/* Trust line */}
        <p className="text-sm text-muted-foreground/60 animate-in fade-in duration-700 delay-300">
          No credit card required · Free to start · Real-time collaboration
        </p>

        {/* Live indicator */}
        <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-2 text-xs font-semibold text-emerald-400 animate-in fade-in duration-700 delay-500">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live transcription — meetings running right now
        </div>

        {/* Dashboard mock */}
        <div className="mt-16 mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur-sm">
            {/* Mock header */}
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/70" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-xs text-muted-foreground">Meeting Bot — Dashboard</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                <Radio className="h-3 w-3" />
                1 Live room
              </div>
            </div>

            {/* Mock content */}
            <div className="grid grid-cols-4 gap-px bg-border/30 p-px">
              {/* Stats */}
              {[
                { label: "Meetings", value: "24", color: "text-blue-400" },
                { label: "Live rooms", value: "1", color: "text-emerald-400" },
                { label: "AI Summaries", value: "18", color: "text-violet-400" },
                { label: "Open tasks", value: "7", color: "text-amber-400" },
              ].map((s) => (
                <div key={s.label} className="bg-card flex flex-col items-center justify-center py-6 gap-1">
                  <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mock meeting list */}
            <div className="p-5 space-y-2">
              {[
                { title: "Q1 Product Review", status: "active", time: "now" },
                { title: "Engineering Standup", status: "ended", time: "2h ago" },
                { title: "Customer Discovery Call", status: "ended", time: "Yesterday" },
              ].map((m) => (
                <div key={m.title} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${m.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium text-foreground">{m.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.status === 'active' ? (
                      <span className="text-[11px] font-bold text-emerald-400 uppercase">Live</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground uppercase">Ended</span>
                    )}
                    <span className="text-[11px] text-muted-foreground/60">{m.time}</span>
                    <Zap className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                </div>
              ))}
            </div>
          </div>
         
        </div>
      </div>
    </section>
  );
}
