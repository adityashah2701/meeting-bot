"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, CalendarDays, LineChart, CheckSquare, Sparkles, Plug } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/integrations", label: "Integrations", icon: Plug },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 border border-transparent px-3 py-2 text-sm transition-colors",
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

export function AppSidebar() {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 self-start border-r border-border bg-background lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="border-b border-border px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-border bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Meeting Bot</p>
              <p className="text-xs text-muted-foreground">Realtime workspace</p>
            </div>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full justify-start border border-border bg-background px-3 py-2 rounded-none",
              },
            }}
          />
          <NavLinks />
        </div>
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8 rounded-none border border-border" } }} />
            <div>
              <p className="text-sm text-foreground">Account</p>
              <p className="text-xs text-muted-foreground">Manage profile</p>
            </div>
          </div>
        </div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 p-4">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full justify-start border border-border bg-background px-3 py-2 rounded-none",
                },
              }}
            />
            <NavLinks />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
