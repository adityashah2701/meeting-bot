// components/home/footer.tsx
import React from 'react';
import Link from 'next/link';
import { Bot, Github, ShieldCheck, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <>
      {/* ── Final CTA section ── */}
      <section className="w-full max-w-4xl mx-auto mt-32 mb-0 text-center px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-card p-12 md:p-16">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Start your first meeting free
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Join teams already using Meeting Bot to turn conversations into structured knowledge. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="h-13 px-10 text-base gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                <Link href="/sign-up">Create free account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-10 text-base hover:-translate-y-0.5 transition-all">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground/60">
              Free plan includes unlimited meetings · No setup needed
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-20 border-t border-border/60 bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="font-bold text-base tracking-tight text-foreground">Meeting Bot</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered meeting intelligence for modern teams.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                  <a href="#" aria-label="GitHub"><Github className="h-4 w-4" /></a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                  <a href="#" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Product</p>
              <ul className="space-y-2">
                {['Features', 'How it works', 'Integrations', 'Changelog'].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Company</p>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Legal</p>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border/40 pt-6">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Meeting Bot. All rights reserved.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">SOC 2 Compliant · End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
