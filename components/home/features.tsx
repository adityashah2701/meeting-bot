/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, FileText, Bot, CheckCircle2, Mic } from "lucide-react";
import { FadeIn } from "@/components/home/sections";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   FAKE UI MOCKUP COMPONENTS
───────────────────────────────────────────── */
const transcriptLines = [
  {
    id: 1,
    name: "Alice",
    text: "Let's review the Q3 roadmap.",
    color: "bg-blue-500",
  },
  {
    id: 2,
    name: "Bob",
    text: "I think we need to prioritize the new dashboard.",
    color: "bg-emerald-500",
  },
  {
    id: 3,
    name: "Alice",
    text: "Agreed. Can we get that done by August?",
    color: "bg-blue-500",
  },
  {
    id: 4,
    name: "Charlie",
    text: "I'll coordinate with the design team today.",
    color: "bg-purple-500",
  },
];

function AnimatedTranscript() {
  return (
    <div className="absolute inset-0 p-4 sm:p-6 flex flex-col gap-4 overflow-hidden mask-fade-out">
      {transcriptLines.map((line) => (
        <motion.div
          key={line.id}
          whileHover={{ scale: 1.02, x: 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex gap-3 items-start cursor-default"
        >
          <div
            className={`h-8 w-8 rounded-full ${line.color} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}
          >
            {line.name[0]}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {line.name}
            </span>
            <div className="bg-background/80 backdrop-blur-md p-3 rounded-xl rounded-tl-none border border-border/50 text-[13px] text-foreground shadow-sm">
              {line.text}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AnimatedSummary() {
  return (
    <div className="absolute inset-0 px-5 pb-5 pt-0 sm:px-7 sm:pb-7 flex flex-col overflow-hidden mask-fade-out">
      <div className="flex items-center gap-2 border-b border-border/50 pb-4 mb-4">
        <Bot className="h-4 w-4 text-foreground" />
        <span className="font-semibold text-sm">Meeting Summary</span>
      </div>

      <div className="flex flex-col gap-6">
        <motion.div whileHover={{ x: 2 }}>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Key Decisions
          </h4>
          <ul className="text-[13px] flex flex-col gap-3 cursor-default">
            <li className="flex gap-2.5 items-start group">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-foreground/90 group-hover:text-foreground transition-colors">
                Q3 Launch officially delayed to mid-August
              </span>
            </li>
            <li className="flex gap-2.5 items-start group">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-foreground/90 group-hover:text-foreground transition-colors">
                Adopt new minimalist design system
              </span>
            </li>
          </ul>
        </motion.div>

        <motion.div whileHover={{ x: 2 }}>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Action Items
          </h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-[13px] p-2.5 bg-background rounded-lg border border-border shadow-sm group cursor-default">
              <div className="h-3.5 w-3.5 rounded-sm border border-muted-foreground/40 group-hover:border-emerald-500 transition-colors" />
              <span className="text-foreground/90 font-medium group-hover:text-foreground transition-colors">
                Update marketing copy
              </span>
              <div className="ml-auto text-[10px] font-semibold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors">
                Alice
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedActionItems() {
  return (
    <div className="absolute inset-0 px-6 pb-6 pt-0 flex flex-col gap-3 overflow-hidden mask-fade-out">
      <div className="flex items-center gap-3 text-[13px] p-3 bg-background rounded-lg border border-border shadow-sm transform transition-all hover:scale-[1.02]">
        <div className="h-4 w-4 rounded-sm border border-emerald-500 bg-emerald-500/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        </div>
        <span className="text-foreground/90 font-medium">
          Update marketing copy
        </span>
        <div className="ml-auto h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
          A
        </div>
      </div>
      <div className="flex items-center gap-3 text-[13px] p-3 bg-background rounded-lg border border-border shadow-sm transform transition-all hover:scale-[1.02]">
        <div className="h-4 w-4 rounded-sm border border-muted-foreground/40 shrink-0" />
        <span className="text-foreground/90 font-medium">Review Q3 Budget</span>
        <div className="ml-auto h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
          B
        </div>
      </div>
      <div className="flex items-center gap-3 text-[13px] p-3 bg-background rounded-lg border border-border shadow-sm transform transition-all hover:scale-[1.02]">
        <div className="h-4 w-4 rounded-sm border border-muted-foreground/40 shrink-0" />
        <span className="text-foreground/90 font-medium">Schedule offsite</span>
        <div className="ml-auto h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
          C
        </div>
      </div>
    </div>
  );
}

function AnimatedSpeakerId() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative flex items-center justify-center w-full h-full group">
        {/* Central mic */}
        <div className="absolute z-20 h-12 w-12 rounded-full bg-background border border-border shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(var(--foreground),0.1)] transition-all duration-500">
          <Mic className="h-5 w-5 text-foreground" />
        </div>

        {/* Hover avatars */}
        <div className="absolute z-10 -ml-24 -mt-16 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2 cursor-default">
          A
        </div>
        <div className="absolute z-10 ml-24 -mt-8 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-1 cursor-default">
          B
        </div>
        <div className="absolute z-10 -ml-16 mt-20 h-11 w-11 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform duration-500 group-hover:-translate-x-1 group-hover:translate-y-2 cursor-default">
          C
        </div>

        {/* Hover Ripples */}
        <div className="absolute z-0 h-12 w-12 rounded-full border border-foreground/20 bg-foreground/5 pointer-events-none transition-all duration-700 opacity-0 group-hover:scale-[2.5] group-hover:opacity-50" />
        <div className="absolute z-0 h-12 w-12 rounded-full border border-foreground/20 bg-foreground/5 pointer-events-none transition-all duration-1000 opacity-0 group-hover:scale-[3.5] group-hover:opacity-30 delay-100" />
      </div>
    </div>
  );
}

function BentoCard({
  className,
  title,
  description,
  children,
  delay = 0,
}: {
  className?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay} className={cn("w-full h-full", className)}>
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative w-full h-full overflow-hidden rounded-2xl md:rounded-[2rem] border border-border/40 bg-background/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] flex flex-col group"
      >
        <div className="absolute inset-0 rounded-2xl md:rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none z-20" />
        <div className="absolute inset-0 bg-linear-to-br from-muted/30 to-muted/10 backdrop-blur-md pointer-events-none z-10" />

        <div className="relative z-30 p-6 sm:p-8 flex flex-col gap-2 shrink-0">
          <h3 className="text-2xl font-semibold tracking-tighter text-foreground leading-[1.1]">
            {title}
          </h3>
          <p className="text-[15px] text-muted-foreground font-normal tracking-wide max-w-[400px]">
            {description}
          </p>
        </div>

        <div className="relative flex-1 w-full min-h-[220px] z-30 overflow-hidden">
          {children}
        </div>
      </motion.div>
    </FadeIn>
  );
}

function BentoGridSection() {
  return (
    <section className="w-full py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1 */}
        <BentoCard
          className="md:col-span-2 min-h-[380px]"
          title="Live stream. Perfect memory."
          description="Every voice is captured, identified, and transcribed instantly. You focus on the conversation."
        >
          <AnimatedTranscript />
        </BentoCard>

        <BentoCard
          className="md:col-span-1 min-h-[380px]"
          delay={0.1}
          title="Speaker ID"
          description="Advanced voice isolation distinguishes between multiple speakers perfectly."
        >
          <AnimatedSpeakerId />
        </BentoCard>

        {/* Row 2 */}
        <BentoCard
          className="md:col-span-1 min-h-[380px]"
          delay={0.2}
          title="Action Items"
          description="Tasks extracted automatically and assigned in real-time."
        >
          <AnimatedActionItems />
        </BentoCard>

        <BentoCard
          className="md:col-span-2 min-h-[380px]"
          delay={0.3}
          title="Clarity from chaos."
          description="We extract decisions, dates, and action items the second your meeting ends."
        >
          <AnimatedSummary />
        </BentoCard>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   WORKFLOW COMPONENT (Horizontal Tree)
───────────────────────────────────────────── */
function AnimatedWorkflow() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted)
    return <div className="h-[340px] w-full max-w-[600px] mx-auto" />;

  return (
    <div className="relative w-full max-w-[600px] mx-auto h-[340px]">
      {/* SVG Connections */}
      <svg
        viewBox="0 0 600 340"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {/* Top Branch (to Calendar) */}
        <motion.path
          d="M 120 170 C 300 170, 300 70, 480 70"
          stroke="var(--border)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Moving dot on top branch */}
        <motion.circle
          r="3"
          fill="var(--foreground)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
            delay: 0.5,
          }}
        >
          <animateMotion
            dur="2.5s"
            repeatCount="indefinite"
            path="M 120 170 C 300 170, 300 70, 480 70"
            begin="0.5s"
          />
        </motion.circle>

        {/* Bottom Branch (to Notion) */}
        <motion.path
          d="M 120 170 C 300 170, 300 270, 480 270"
          stroke="var(--border)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Moving dot on bottom branch */}
        <motion.circle
          r="3"
          fill="var(--foreground)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
            delay: 1.5,
          }}
        >
          <animateMotion
            dur="2.5s"
            repeatCount="indefinite"
            path="M 120 170 C 300 170, 300 270, 480 270"
            begin="1.5s"
          />
        </motion.circle>
      </svg>

      {/* Nodes */}

      {/* Root Node: Meeting Bot (Left) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute left-[80px] top-[170px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10"
      >
        <div className="relative h-20 w-20 rounded-[1.5rem] bg-foreground shadow-2xl flex items-center justify-center overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-background/20 rounded-[1.5rem]"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <Bot className="h-10 w-10 text-background relative z-10" />
        </div>
        <span className="text-[13px] font-semibold text-foreground absolute -bottom-8 whitespace-nowrap">
          Meeting Bot
        </span>
      </motion.div>

      {/* Leaf Node 1: Calendar (Right Top) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute left-[520px] top-[70px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10"
      >
        <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center">
          <Calendar className="h-7 w-7 text-foreground" />
        </div>
        <span className="text-[12px] font-medium text-muted-foreground absolute -bottom-6 whitespace-nowrap">
          Google Calendar
        </span>
      </motion.div>

      {/* Leaf Node 2: Notion (Right Bottom) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="absolute left-[520px] top-[270px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10"
      >
        <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center">
          <FileText className="h-7 w-7 text-foreground" />
        </div>
        <span className="text-[12px] font-medium text-muted-foreground absolute -bottom-6 whitespace-nowrap">
          Notion
        </span>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INTEGRATIONS & CTA
───────────────────────────────────────────── */
function EndSection() {
  return (
    <section className="w-full py-32 border-t border-border bg-background overflow-hidden">
      <div className="max-w-[1000px] mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-semibold tracking-tighter text-foreground mb-6 leading-[1.1]">
            Fits right in.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-lg md:text-xl text-muted-foreground font-normal tracking-widest mb-16 max-w-[400px] mx-auto">
            Connects seamlessly with Google Calendar and Notion.
          </p>
        </FadeIn>

        {/* Animated Workflow Component */}
        <FadeIn delay={0.2} className="mb-32">
          <AnimatedWorkflow />
        </FadeIn>

        {/* Minimal CTA */}
        <FadeIn delay={0.3}>
          <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-semibold tracking-tighter text-foreground mb-10 leading-[1.1]">
            Start meeting better.
          </h2>
        </FadeIn>
        <FadeIn delay={0.4}>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-12 px-8 rounded-md text-[15px] font-medium bg-foreground text-background transition-opacity hover:opacity-90"
          >
            Get started for free
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <div className="bg-background relative">
      <BentoGridSection />
      <EndSection />
    </div>
  );
}
