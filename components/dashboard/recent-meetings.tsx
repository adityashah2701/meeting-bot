'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Video, Clock } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrganization } from '@clerk/nextjs';

export function RecentMeetings() {
  const { organization } = useOrganization();
  const meetings = useQuery(
    api.meetings.getByOrg,
    organization?.id ? { orgId: organization.id } : "skip"
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Recent Meetings</h2>
          <p className="text-sm text-muted-foreground">Your latest intel processing and archives.</p>
        </div>
        <Link href="/meetings" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 group">
          View all 
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-4">
        {meetings === undefined ? (
          <div className="text-sm text-muted-foreground animate-pulse text-center p-8 bg-card border rounded-lg">Loading latest intel...</div>
        ) : meetings.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-8 bg-card border rounded-lg">No recent activity found. Schedule a meeting to start capturing insights.</div>
        ) : (
          meetings.map((meeting) => (
            <Link href={`/meeting/${meeting._id}`} key={meeting._id}>
              <div className="flex items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors shadow-sm group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border border-border/50">
                    <Video className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{meeting.title}</h4>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Status: {meeting.status}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{new Date(meeting._creationTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {meeting.status === 'scheduled' && meeting.scheduledFor ? (
                    <span className="text-sm font-medium text-muted-foreground bg-primary/10 text-primary px-3 py-1 rounded-md flex items-center gap-1.5 border border-primary/20">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(meeting.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground px-3 py-1 bg-secondary rounded-md flex items-center gap-1.5 border border-border/50">
                      Open Room <ArrowRight className="w-3.5 h-3.5 ml-1 inline group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
