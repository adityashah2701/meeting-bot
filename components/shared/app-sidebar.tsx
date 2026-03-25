"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Plug,
  Bot,
  ChevronRight,
  CreditCard,
  FileText,
  ListChecks,
} from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/tasks", label: "Tasks Board", icon: ListChecks },
  { href: "/minutes-of-meetings", label: "Minutes of Meetings", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
              isActive
                ? "bg-primary/10 font-medium text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </span>
            {isActive && (
              <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 self-start border-r border-border/60 bg-card/50 backdrop-blur-sm lg:sticky lg:top-0 lg:flex lg:flex-col">
        {/* Logo */}
        <div className="border-b border-border/60 px-4 py-5">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Meeting Bot</p>
              <p className="text-[11px] text-muted-foreground">
                Realtime workspace
              </p>
            </div>
          </Link>
        </div>

        {/* Org Switcher */}
        <div className="border-b border-border/60 px-4 py-3">
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full justify-start border border-border/60 bg-background/60 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors",
              },
            }}
          />
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Navigation
          </p>
          <NavLinks />
        </div>

        {/* User */}
        <div className="border-t border-border/60 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-muted/40">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "h-8 w-8 rounded-lg border border-border/60",
                },
              }}
            />
            <div>
              <p className="text-sm font-medium text-foreground">Account</p>
              <p className="text-xs text-muted-foreground">Manage profile</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
