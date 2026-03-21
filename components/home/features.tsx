// components/home/features.tsx
import React from 'react';
import { BrainCircuit, FileAudio, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function Features() {
  const features = [
    {
      icon: FileAudio,
      title: "Flawless Transcription",
      desc: "Capture every word with 99% accuracy across 40+ languages. Speaker diarization separates voices instantly."
    },
    {
      icon: BrainCircuit,
      title: "Actionable Insights",
      desc: "Our LLM specifically extracts action items, decisions, and dates, turning hours of talking into bullet points."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      desc: "Create workspaces, share recordings, and search across your entire organization's conversation history."
    }
  ];

  return (
    <section id="how-it-works" className="max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-300">
      {features.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <Card key={i} className="hover:border-primary/30 transition-all shadow-sm bg-card border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground leading-relaxed text-base">
                {feature.desc}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
