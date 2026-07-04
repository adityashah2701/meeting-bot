"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   FadeIn
   Extremely subtle, fast reveal. Zero continuous motion.
───────────────────────────────────────────── */
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 1, 0.5, 1], // Fast, snappy ease
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   ScreenshotFrame
   Premium static image placeholder for product screenshots
───────────────────────────────────────────── */
interface ScreenshotFrameProps {
  aspectRatio?: "16:9" | "16:10" | "4:3" | "3:4" | "square" | "auto";
  label?: string;
  className?: string;
  children?: React.ReactNode; // Optional children if we want to add small UI overlays later
}

const aspectRatios = {
  "16:9": "aspect-video",
  "16:10": "aspect-[16/10]",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  square: "aspect-square",
  auto: "aspect-auto",
};

export function ScreenshotFrame({
  aspectRatio = "16:9",
  label,
  className,
  children,
}: ScreenshotFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl md:rounded-2xl border border-border/40 bg-background/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]",
        aspectRatios[aspectRatio],
        className
      )}
    >
      {/* Subtle inner shadow/border for depth */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
      
      {/* Gradient subtle background to make it look premium */}
      <div className="absolute inset-0 bg-linear-to-br from-muted/30 to-muted/10 backdrop-blur-md pointer-events-none" />
      
      {/* Optional minimal label centered (only if no children) */}
      {label && !children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[13px] font-medium text-muted-foreground/40 tracking-wide">
            {label}
          </span>
        </div>
      )}

      {/* Actual content */}
      <div className="relative w-full h-full z-10">
        {children}
      </div>
    </div>
  );
}
