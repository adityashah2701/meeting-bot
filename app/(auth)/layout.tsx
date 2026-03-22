import React from 'react';
import { Sparkles, Activity } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden flex-1 justify-between overflow-hidden border-r border-border bg-card p-12 lg:flex lg:flex-col">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">MeetMind AI</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Turn Meetings into Insights.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            The Editorial Intelligence platform that transcribes, analyzes, and curates your professional conversations into actionable strategic outcomes.
          </p>
        </div>

        <div className="space-y-4 relative z-10 max-w-md">
          <div className="flex items-center gap-3 border border-border bg-background p-4 shadow-sm">
            <div className="bg-muted p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">99% Accuracy</p>
              <p className="text-xs text-muted-foreground">Enterprise-grade transcription models.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-border bg-background p-4 shadow-sm">
            <div className="bg-muted p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Real-Time Analysis</p>
              <p className="text-xs text-muted-foreground">Insights generated as you speak.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-background p-8">
        <div className="flex w-full max-w-sm flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
