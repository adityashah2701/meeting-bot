"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, organization } = useOrganization();

  useEffect(() => {
    if (isLoaded && !organization) {
      router.push('/onboarding');
    }
  }, [isLoaded, organization, router]);

  if (!isLoaded) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center animate-pulse" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
          <div className="w-px h-4 bg-border mx-2" />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background relative">
          {/* Subtle noise texture or minimal background element if desired */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] pointer-events-none mix-blend-overlay" />
          
          <div className="p-8 pb-32 max-w-7xl mx-auto h-full w-full animate-in fade-in duration-500 relative z-10">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
