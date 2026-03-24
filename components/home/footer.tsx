"use client";

import React from "react";
import Link from "next/link";
import { Bot, Github, ShieldCheck, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <>
      {/* ── Final CTA section ── */}
      <section className="w-full max-w-[800px] mx-auto mt-36 mb-0 text-center px-6">
        <div className="relative overflow-hidden rounded-2xl border border-primary/[0.12] bg-gradient-to-b from-primary/[0.06] to-[oklch(0.14_0.008_85)] p-12 md:p-16">
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[300px] w-[400px] rounded-full bg-primary/[0.06] blur-[80px]" />
          </div>

          <div className="relative">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08]">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl md:text-[2.5rem] font-extrabold tracking-[-0.03em] text-foreground mb-4 leading-[1.15]">
              Start your first meeting
            </h2>
            <p className="text-[1.05rem] text-muted-foreground/55 mb-8 max-w-[420px] mx-auto leading-relaxed">
              Join teams already using Meeting Bot to turn conversations into structured knowledge.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.3),0_4px_16px_-4px] shadow-primary/25 hover:shadow-[0_4px_24px_-4px] hover:shadow-primary/35 hover:-translate-y-0.5 transition-all duration-300"
              >
                <Link href="/sign-up">Create free account</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-[15px] font-semibold rounded-xl border-white/[0.08] bg-white/[0.02] text-foreground/90 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
            <p className="mt-5 text-[11px] text-muted-foreground/35 font-medium tracking-wide">
              Free plan includes unlimited meetings · No setup needed
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-24 border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] ring-1 ring-primary/15 text-primary">
                  <Bot className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">Meeting Bot</span>
              </Link>
              <p className="text-[13px] text-muted-foreground/45 leading-relaxed max-w-[220px]">
                AI-powered meeting intelligence for modern teams.
              </p>
              <div className="mt-5 flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-foreground/80 transition-colors" asChild>
                  <a href="#" aria-label="GitHub"><Github className="h-4 w-4" /></a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-foreground/80 transition-colors" asChild>
                  <a href="#" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/35 mb-4">Product</p>
              <ul className="space-y-2.5">
                {["Features", "How it works", "Integrations", "Changelog"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-[13px] text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/35 mb-4">Company</p>
              <ul className="space-y-2.5">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-[13px] text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/35 mb-4">Legal</p>
              <ul className="space-y-2.5">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-[13px] text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/[0.04] pt-7">
            <p className="text-[11px] text-muted-foreground/30 font-medium">
              © {new Date().getFullYear()} Meeting Bot. All rights reserved.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
              <span className="text-[11px] font-medium text-muted-foreground/40">SOC 2 Compliant · End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
