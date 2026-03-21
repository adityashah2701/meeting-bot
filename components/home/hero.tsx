// components/home/hero.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
        <Sparkles className="w-3.5 h-3.5" />
        Introducing Editorial Intelligence
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-8 leading-[1.1]">
        Your meetings, <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">perfectly distilled.</span>
      </h1>
      
      <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
        Record, transcribe, and extract high-signal insights from every conversation. 
        MeetMind AI acts as your personal chief of staff for every Zoom, Meet, or Teams call.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/sign-up">
          <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg hover:-translate-y-0.5 transition-all">
            Start for free <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
        <Link href="#how-it-works">
          <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
            See how it works
          </Button>
        </Link>
      </div>
      <div className="mt-6 text-sm text-muted-foreground font-medium">
        No credit card required. Free 14-day trial on Team plans.
      </div>
    </section>
  );
}
