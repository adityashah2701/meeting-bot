"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50">
      {/* Subtle top highlight line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="border-b border-white/[0.06] bg-[oklch(0.12_0.006_85/0.7)] backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto max-w-[1200px] px-6 h-[64px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40 group-hover:shadow-[0_0_12px_-2px] group-hover:shadow-primary/20">
              <Bot className="h-[18px] w-[18px] text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Meeting Bot
            </span>
          </Link>

          {/* Nav links */}
          {/* <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Integrations", href: "#integrations" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative px-3.5 py-2 text-[13px] font-medium text-muted-foreground/80 transition-colors duration-200 hover:text-foreground group"
              >
                {link.label}
                <span className="absolute inset-x-3.5 -bottom-px h-px bg-primary scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </div> */}

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
            >
              Sign in
            </Link>
            <Button
              asChild
              size="sm"
              className="h-8 px-4 text-[13px] font-semibold rounded-lg bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.3),inset_0_1px_0_0_rgb(255_255_255/0.06)] hover:shadow-[0_2px_8px_-2px] hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-px"
            >
              <Link href="/sign-up">Get started free</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
