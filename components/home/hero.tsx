"use client";

import React from "react";
import Image from "next/image";
import { FadeIn, ScreenshotFrame } from "@/components/home/sections";

export function Hero() {
  return (
    <section className="relative w-full pt-12 pb-16 px-6 lg:px-8 bg-background overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/40 via-background to-background -z-10 pointer-events-none" />
      
      <div className="max-w-[1200px] mx-auto flex flex-col items-start w-full relative z-10">
        {/* Typographic Hero */}
        <FadeIn className="text-left mb-8 md:mb-5 w-full">
          <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-semibold tracking-tighter text-foreground leading-[1.1]">
            Meetings, mastered.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-normal max-w-[500px] tracking-widest">
            Talk normally. We capture everything.
          </p>
        </FadeIn>

        {/* Product Mockup Frame */}
        <FadeIn delay={0.1} className="w-full">
          <ScreenshotFrame
            aspectRatio="auto"
            className="w-full max-w-[1200px] mx-auto p-3"
          >
            <div className="relative w-full h-auto">
              {/* Light Mode Image */}
              <Image
                src="/image.png"
                alt="Dashboard Overview Light"
                width={2880}
                height={1800}
                priority
                className="w-full h-auto rounded-md md:rounded-xl shadow-2xl border border-border/20 transition-opacity duration-500 ease-in-out dark:opacity-0"
              />
              {/* Dark Mode Image */}
              <Image
                src="/image-dark.png"
                alt="Dashboard Overview Dark"
                width={2880}
                height={1800}
                priority
                className="absolute top-0 left-0 w-full h-auto rounded-md md:rounded-xl shadow-2xl border border-border/20 transition-opacity duration-500 ease-in-out opacity-0 dark:opacity-100"
              />
            </div>
          </ScreenshotFrame>
        </FadeIn>
      </div>
    </section>
  );
}
