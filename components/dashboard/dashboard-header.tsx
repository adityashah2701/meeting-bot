import React from 'react';
import { CreateMeetingDialog } from '@/components/meeting/create-meeting-dialog';
import { OrganizationSwitcher } from '@clerk/nextjs';
import { NotificationBell } from '@/components/layout/notification-bell';

export function DashboardHeader() {
  return (
    <header>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Welcome back!
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your organization's meetings, transcripts, and insights all in one place.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <OrganizationSwitcher hidePersonal={true} />
          <CreateMeetingDialog />
        </div>
      </div>
    </header>
  );
}
