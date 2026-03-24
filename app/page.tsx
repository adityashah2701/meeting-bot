import React from "react";
import { Navbar } from "@/components/home/navbar";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { Footer } from "@/components/home/footer";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata(
  "Home",
  "AI-powered meeting intelligence — real-time transcription, summaries, and team collaboration in one workspace.",
);

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20 landing-page">
      <Navbar />
      <main className="flex-1 flex flex-col items-center pt-32 pb-0">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
