import React from 'react';
import { MeetingsHeader } from '@/components/meetings/meetings-header';
import { MeetingsTable } from '@/components/meetings/meetings-table';

export default function MeetingsListPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <MeetingsHeader />
      <div className="flex-1 overflow-auto">
        <MeetingsTable />
      </div>
    </div>
  );
}
