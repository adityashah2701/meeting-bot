"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Radio, Sparkles } from "lucide-react";

function AnimatedGradientOrb() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* Primary glow - slow drift */}
      <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/[0.07] blur-[100px] animate-[drift_20s_ease-in-out_infinite]" />
      {/* Secondary accent - subtle blue */}
      <div className="absolute top-[80px] left-[15%] h-[300px] w-[300px] rounded-full bg-blue-500/4 blur-[80px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
      {/* Warm accent */}
      <div className="absolute top-[120px] right-[15%] h-[250px] w-[250px] rounded-full bg-amber-500/3 blur-[80px] animate-[drift_22s_ease-in-out_infinite_2s]" />
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "128px 128px" }} />
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="relative">
      {/* Glow behind the mock */}
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-linear-to-b from-primary/6 to-transparent blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-12px_rgb(0_0_0/0.15)] dark:shadow-[0_20px_60px_-12px_rgb(0_0_0/0.5)]">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-3 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1">
              <span className="text-[11px] text-muted-foreground/60">app.meetingbot.ai/dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">
            <Radio className="h-2.5 w-2.5" />
            1 LIVE
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 divide-x divide-border">
          {[
            { label: "Meetings", value: "24", accent: "text-blue-600 dark:text-blue-400", glow: "" },
            { label: "Live rooms", value: "1", accent: "text-emerald-600 dark:text-emerald-400", glow: "" },
            { label: "AI Summaries", value: "18", accent: "text-violet-600 dark:text-violet-400", glow: "" },
            { label: "Open tasks", value: "7", accent: "text-amber-600 dark:text-amber-400", glow: "" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-6 gap-0.5">
              <p className={`text-2xl font-extrabold tabular-nums tracking-tight ${s.accent}`}>{s.value}</p>
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Meeting list */}
        <div className="border-t border-border p-4 space-y-1.5">
          {[
            { title: "Q1 Product Review", status: "active", time: "now", participants: 4 },
            { title: "Engineering Standup", status: "ended", time: "2h ago", participants: 6 },
            { title: "Customer Discovery Call", status: "ended", time: "Yesterday", participants: 3 },
          ].map((m) => (
            <div key={m.title} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${m.status === "active" ? "bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/40 animate-pulse" : "bg-muted-foreground/20"}`} />
                <span className="text-sm font-medium text-foreground/90">{m.title}</span>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{m.participants} attendees</span>
              </div>
              <div className="flex items-center gap-3">
                {m.status === "active" ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Ended</span>
                )}
                <span className="text-[10px] text-muted-foreground/40">{m.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom fade */}
        <div className="h-8 bg-linear-to-t from-card to-transparent" />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative w-full text-center px-6 lg:px-8">
      <AnimatedGradientOrb />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Pill badge */}
        <div className="landing-animate landing-animate-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/6 text-primary text-[11px] font-semibold uppercase tracking-[0.08em] mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Meeting Intelligence
        </div>

        {/* Headline */}
        <h1 className="landing-animate landing-animate-delay-2 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold tracking-[-0.035em] text-foreground leading-[1.08] mb-6">
          Every meeting, <br className="hidden md:block" />
          <span className="relative inline-block">
            <span className="bg-linear-to-r from-primary via-[oklch(0.78_0.06_60)] to-primary bg-clip-text text-transparent bg-size-[200%_auto] animate-[shimmer_6s_ease-in-out_infinite]">
              perfectly captured.
            </span>
          </span>
        </h1>

        {/* Subline */}
        <p className="landing-animate landing-animate-delay-3 text-lg md:text-[1.2rem] text-muted-foreground/70 max-w-[540px] mx-auto mb-10 leading-[1.7] font-normal">
          Real-time transcription, AI-generated summaries, and action items —{" "}
          all in one workspace. No more lost decisions.
        </p>

        {/* CTAs */}
        <div className="landing-animate landing-animate-delay-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-7 text-[15px] font-semibold gap-2.5 rounded-xl bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.3),0_4px_16px_-4px] shadow-primary/25 hover:shadow-[0_4px_24px_-4px] hover:shadow-primary/35 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Link href="/sign-up">
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-7 text-[15px] font-semibold gap-2 rounded-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>

        {/* Trust line */}
        <p className="landing-animate landing-animate-delay-5 text-[13px] text-muted-foreground/40 font-medium">
          No credit card required · Free to start · Setup in 30 seconds
        </p>

        {/* Live indicator */}
        <div className="landing-animate landing-animate-delay-5 mt-10 inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/6 px-4 py-2 text-[12px] font-medium text-emerald-400/80">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live transcription — meetings running right now
        </div>

        {/* Dashboard mock */}
        <div className="landing-animate landing-animate-delay-6 mt-16 mx-auto max-w-[960px]">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
