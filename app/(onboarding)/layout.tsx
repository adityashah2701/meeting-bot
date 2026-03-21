import React from 'react';
import { Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-container-lowest flex-col">
      {/* Top Header */}
      <header className="flex justify-between items-center p-6 border-b border-outline-variant/10 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-on-primary" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-on-surface">MeetMind AI</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>SOC2 Compliant</span>
          </div>
          <Link href="#" className="text-xs font-medium text-on-surface-variant flex items-center gap-1 hover:text-on-surface transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            Need help?
          </Link>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 sm:p-12 mb-20">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
    </div>
  );
}
