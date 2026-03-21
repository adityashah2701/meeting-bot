import React from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentMeetings } from '@/components/dashboard/recent-meetings';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <DashboardHeader />
      <DashboardStats />
      <RecentMeetings />
    </div>
  );
}
