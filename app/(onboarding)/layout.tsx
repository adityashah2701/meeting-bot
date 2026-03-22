import React from 'react';
import { Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/90 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">MeetMind AI</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>SOC2 Compliant</span>
          </div>
          <Link href="#" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            Need help?
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-6 sm:p-12 mb-20">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
    </div>
  );
}
