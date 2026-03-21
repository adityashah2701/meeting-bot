import React from 'react';
import Link from 'next/link';
import { ArrowRight, Video, Clock } from 'lucide-react';

const recentMeetings = [
  { title: "Product Strategy Sync", host: "Sarah Miller", date: "Oct 24, 2023", duration: "45 min" },
  { title: "Q4 Budget Planning", host: "David Chen", date: "Oct 23, 2023", duration: "1h 12min" },
  { title: "Design Review: MeetMind v2", host: "Alex Johnson", date: "Oct 22, 2023", duration: "28 min" },
  { title: "Bi-weekly Engineering Standup", host: "Marcus Wu", date: "Oct 21, 2023", duration: "15 min" },
];

export function RecentMeetings() {
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
        {recentMeetings.map((meeting, i) => (
          <div key={i} className="flex items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors shadow-sm group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border border-border/50">
                <Video className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{meeting.title}</h4>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Host: {meeting.host}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{meeting.date}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-md flex items-center gap-1.5 border border-border/50">
                <Clock className="w-3.5 h-3.5" />
                {meeting.duration}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
