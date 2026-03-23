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
        toast.message(notification.message, {
          action: notification.link
            ? {
                label: "Open",
                onClick: () => router.push(notification.link!),
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
            {notifications.map((n) => (
              <DropdownMenuItem key={n._id} className="cursor-pointer" asChild>
                <div 
                  className={`flex flex-col gap-1 px-4 py-3 ${!n.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (!n.isRead) markRead({ notificationId: n._id });
                    if (n.link) {
                      router.push(n.link);
                    }
                  }}
                >
                  {n.title ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {n.title}
                    </span>
                  ) : null}
                  <span className={`text-sm ${!n.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {n.message}
                  </span>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-primary hover:underline mt-1" onClick={(event) => event.stopPropagation()}>
                      {n.kind === "meeting_invitation" ? "Open invitation" : "View Meeting"}
                    </Link>
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
