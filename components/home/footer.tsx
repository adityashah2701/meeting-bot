"use client";

import React from "react";
import Link from "next/link";
import { Bot, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-[14px] font-semibold tracking-tight text-foreground">Meeting Bot</span>
            </Link>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[200px]">
              AI-powered meeting intelligence for modern teams.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[12px] font-semibold text-foreground mb-4">Product</p>
            <ul className="space-y-3">
              {["Features", "Integrations", "Pricing", "Changelog"].map((l) => (
                <li key={l}>
                  <Link href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-[12px] font-semibold text-foreground mb-4">Company</p>
            <ul className="space-y-3">
              {["About", "Blog", "Careers", "Contact"].map((l) => (
                <li key={l}>
                  <Link href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[12px] font-semibold text-foreground mb-4">Legal</p>
            <ul className="space-y-3">
              {["Privacy Policy", "Terms of Service", "Security"].map((l) => (
                <li key={l}>
                  <Link href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} Meeting Bot. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] text-muted-foreground">Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
