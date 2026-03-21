/* eslint-disable react-hooks/purity */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, FastForward, Rewind, MessageSquare, CheckCircle, Share, Download } from 'lucide-react';

export default function MeetingDetailsPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto h-full flex flex-col w-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-md border border-primary/20">
              Analyzed
            </span>
            <span className="text-sm text-muted-foreground font-medium">Oct 24, 2023 • 45 min</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
            Product Strategy Sync
          </h1>
          <p className="text-sm text-muted-foreground">Host: Sarah Miller</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Share className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </header>

      {/* Media Player Area */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden group shadow-sm">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        {/* Fake Audio Waveform */}
        <div className="flex items-center gap-1 h-16 w-full max-w-xl mx-auto opacity-30 group-hover:opacity-60 transition-opacity">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex-1 bg-primary rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-6 mt-6 z-10 bg-background px-6 py-2 rounded-full border border-border shadow-sm">
          <button className="text-foreground hover:text-primary transition-colors"><Rewind className="w-5 h-5 fill-current" /></button>
          <button className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md">
            <Play className="w-4 h-4 fill-current ml-1" />
          </button>
          <button className="text-foreground hover:text-primary transition-colors"><FastForward className="w-5 h-5 fill-current" /></button>
          <span className="text-sm font-medium text-muted-foreground ml-4 border-l border-border pl-4">12:04 / 45:00</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        {/* Transcript Column */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-muted/50">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground text-sm">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {[
              { speaker: "Sarah Miller", time: "00:00", text: "Alright, let's get started. The main goal of this sync is to align on the core features for the v2 launch and finalize our timeline." },
              { speaker: "Alex Johnson", time: "00:15", text: "I've reviewed the design specs and I think we're solid on the UI, but the backend implementation for the real-time AI processing might need another week." },
              { speaker: "Sarah Miller", time: "00:30", text: "Understood. Can we mitigate that by splitting the AI models? Running transcription locally and just doing summaries in the cloud?" },
              { speaker: "Alex Johnson", time: "00:45", text: "That's exactly what I was thinking. It will reduce latency and server costs significantly." },
            ].map((msg, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0 text-secondary-foreground">
                  {msg.speaker.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-foreground">{msg.speaker}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Column */}
        <div className="w-full lg:w-96 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-primary/5">
            <h3 className="font-bold text-primary text-sm tracking-wide uppercase">Editorial Intelligence</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-8">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Key Summary
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The team agreed to proceed with a hybrid AI model approach for v2 to minimize latency. Client-side transcription will be implemented, communicating with cloud-based summarization engines via a new API bridging layer.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" /> Action Items
              </h4>
              <ul className="space-y-3">
                {[
                  { text: "Draft technical spec for hybrid AI approach", owner: "Alex", done: false },
                  { text: "Update product roadmap timeline +1 week", owner: "Sarah", done: true },
                  { text: "Schedule review with infosec regarding local models", owner: "Alex", done: false },
                ].map((task, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.done ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'}`}>
                      {task.done && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className={`text-sm ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.text}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">Assigned to: <span className="font-medium text-foreground">{task.owner}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
