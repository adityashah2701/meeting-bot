// components/home/footer.tsx
import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">MeetMind AI</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
          <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>SOC2 Compliant</span>
        </div>
      </div>
    </footer>
  );
}
