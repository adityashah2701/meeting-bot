"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Menu,
  LayoutDashboard,
  CalendarDays,
  Plug,
  CreditCard,
  Sparkles,
  FileText,
  ListChecks,
  X,
} from "lucide-react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { LoadingBlock } from "@/components/shared/loading-block";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CreateMeetingDialog } from "@/features/meeting/components/create-meeting-dialog";
import { useSyncOrganizationBilling } from "@/features/billing/hooks/use-sync-organization-billing";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/tasks", label: "Tasks Board", icon: ListChecks },
  { href: "/minutes-of-meetings", label: "Minutes of Meetings", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 border border-transparent px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "border-border bg-muted text-foreground"
                : "text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DashboardHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentPage =
    navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      {/* Left: Mobile menu + page title */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger → Drawer */}
        <Drawer direction="left" open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DrawerTrigger>

          <DrawerContent className="flex h-full w-72 flex-col p-0">
            {/* Drawer top bar */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                onClick={() => setOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Meeting Bot
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Realtime workspace
                  </p>
                </div>
              </Link>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>

            {/* Org switcher + nav */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    organizationSwitcherTrigger:
                      "w-full justify-start border border-border bg-background px-3 py-2 rounded-none text-sm",
                  },
                }}
              />
              <MobileNavLinks onNavigate={() => setOpen(false)} />
            </div>

            {/* User section at bottom */}
            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        "h-8 w-8 rounded-none border border-border",
                    },
                  }}
                />
                <div>
                  <p className="text-sm text-foreground">Account</p>
                  <p className="text-xs text-muted-foreground">
                    Manage profile
                  </p>
                </div>
              </div>
            </div>

            {/* Start Meeting inside drawer (mobile) */}
            <div className="border-t border-border px-4 py-3">
              <CreateMeetingDialog
                triggerLabel="Start Meeting"
                triggerVariant="outline"
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Page breadcrumb title */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">
            Workspace
          </span>
          <span className="hidden text-xs text-muted-foreground lg:inline">
            /
          </span>
          <span className="text-sm font-medium text-foreground">
            {currentPage}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <CreateMeetingDialog
            triggerLabel="Start Meeting"
            triggerVariant="outline"
          />
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, organization } = useOrganization();
  useSyncOrganizationBilling(organization?.id);

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
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
