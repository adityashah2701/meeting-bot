import React from 'react';
import { Sparkles, Activity } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Left Pane - Editorial Pitch */}
      <div className="hidden lg:flex flex-col flex-1 bg-surface-container-low p-12 justify-between border-r border-outline-variant/10 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-on-primary" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight text-on-surface">MeetMind AI</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-on-surface tracking-tight leading-tight mb-6">
            Turn Meetings into Insights.
          </h1>
          <p className="text-lg text-on-surface-variant max-w-md leading-relaxed">
            The Editorial Intelligence platform that transcribes, analyzes, and curates your professional conversations into actionable strategic outcomes.
          </p>
        </div>

        <div className="space-y-4 relative z-10 max-w-md">
          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm">
            <div className="p-2 bg-primary-container/30 rounded-lg">
              <Activity className="text-primary w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">99% Accuracy</p>
              <p className="text-xs text-on-surface-variant">Enterprise-grade transcription models.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm">
            <div className="p-2 bg-primary-container/30 rounded-lg">
              <Sparkles className="text-primary w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Real-Time Analysis</p>
              <p className="text-xs text-on-surface-variant">Insights generated as you speak.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-sm flex flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
