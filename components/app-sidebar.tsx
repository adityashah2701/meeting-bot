"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Video,
  LineChart,
  Blocks,
  Settings,
  Sparkles
} from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/recordings', label: 'Recordings', icon: Video },
  { href: '/insights', label: 'Insights', icon: LineChart },
  { href: '/integrations', label: 'Integrations', icon: Blocks },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 mb-2 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 shrink-0 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <h1 className="font-sans font-bold text-base tracking-tight text-foreground leading-tight truncate">MeetMind AI</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">Editorial Intelligence</p>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:space-y-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher 
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full justify-start p-2 rounded-md hover:bg-accent border border-border",
                organizationPreviewMainIdentifier: "text-foreground font-medium text-sm",
                organizationPreviewSecondaryIdentifier: "text-muted-foreground text-xs"
              }
            }}
          />
        </div>
        <div className="flex items-center gap-3 px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <UserButton 
            appearance={{
              elements: { userButtonAvatarBox: "w-8 h-8 border border-border" }
            }}
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-foreground">Account</span>
            <span className="text-xs text-muted-foreground">Manage profile</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
