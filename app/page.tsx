import React from 'react';
import { Navbar } from '@/components/home/navbar';
import { Hero } from '@/components/home/hero';
import { Features } from '@/components/home/features';
import { Footer } from '@/components/home/footer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
      <Navbar />
      <main className="flex-1 flex flex-col items-center pt-32 pb-20 px-6 lg:px-8">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
