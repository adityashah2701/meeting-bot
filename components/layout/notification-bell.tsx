'use client';

import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function resolveNotificationLink(link?: string) {
  if (!link) {
    return null;
  }

  if (link === "/invitations" || link.startsWith("/invitations?")) {
    return "/dashboard#invitation-inbox";
  }

  return link;
}

export function NotificationBell() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const markRead = useMutation(api.notifications.index.markRead);
  const hasHydratedRef = useRef(false);
  const seenNotificationIdsRef = useRef(new Set<string>());

  const notifications = useQuery(
    api.notifications.index.list,
    organization?.id ? { orgId: organization.id } : "skip"
  );

  useEffect(() => {
    if (!organization || !user || !notifications) {
      return;
    }

    if (!hasHydratedRef.current) {
      notifications.forEach((notification) => {
        seenNotificationIdsRef.current.add(notification._id);
      });
      hasHydratedRef.current = true;
      return;
    }

    notifications.forEach((notification) => {
      if (seenNotificationIdsRef.current.has(notification._id)) {
        return;
      }

      seenNotificationIdsRef.current.add(notification._id);
      if (!notification.isRead && notification.kind === "meeting_invitation") {
        const notificationLink = resolveNotificationLink(notification.link);
        toast.message(notification.message, {
          action: notificationLink
            ? {
                label: "Open inbox",
                onClick: () => router.push(notificationLink),
              }
            : undefined,
        });
      }
    });
  }, [notifications, organization, router, user]);

  if (!organization || !user) return null;

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
        </div>
        {notifications === undefined ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
        ) : (
          <div className="py-2">
            {notifications.map((notification) => {
              const notificationLink = resolveNotificationLink(notification.link);
              const ctaLabel = notification.kind === "meeting_invitation"
                ? "Open inbox"
                : "View meeting";

              return (
                <DropdownMenuItem key={notification._id} className="cursor-pointer" asChild>
                  <div
                    className={`flex flex-col gap-1 px-4 py-3 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markRead({ notificationId: notification._id });
                      }
                      if (notificationLink) {
                        router.push(notificationLink);
                      }
                    }}
                  >
                    {notification.title ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {notification.title}
                      </span>
                    ) : null}
                    <span className={`text-sm ${!notification.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </span>
                    {notificationLink ? (
                      <Link
                        href={notificationLink}
                        className="mt-1 text-xs text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {ctaLabel}
                      </Link>
                    ) : null}
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
