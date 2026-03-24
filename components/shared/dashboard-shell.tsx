"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { LoadingBlock } from "@/components/shared/loading-block";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CreateMeetingDialog } from "@/features/meeting/components/create-meeting-dialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, organization } = useOrganization();

  useEffect(() => {
    if (isLoaded && !organization) {
      router.push("/onboarding");
    }
  }, [isLoaded, organization, router]);

  if (!isLoaded) {
    return <div className="p-8"><LoadingBlock className="h-96 w-full" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
                <AppSidebar />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Workspace</p>
              <p className="text-xs text-muted-foreground">Production-grade meeting operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <CreateMeetingDialog triggerLabel="Start Meeting" triggerVariant="outline" />
            </div>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
