"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Activity, CalendarDays, CheckSquare, FileText, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { dashboardService } from "@/features/dashboard/services/dashboard-service";

const statConfig = [
  { key: "totalMeetings", label: "Meetings", icon: CalendarDays },
  { key: "activeMeetings", label: "Live rooms", icon: Radio },
  { key: "summariesGenerated", label: "Summaries", icon: FileText },
  { key: "openTasks", label: "Open tasks", icon: CheckSquare },
] as const;

export function DashboardPage() {
  const { organization } = useOrganization();
  const overview = useQuery(
    dashboardService.getOverview,
    organization?.id ? { orgId: organization.id } : "skip",
  );

  if (overview === undefined) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-border bg-card p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track live meetings, summaries, and follow-up work from one place.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/meetings">Open archive</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statConfig.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {overview.stats[item.key]}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent meetings</CardTitle>
              <p className="text-sm text-muted-foreground">Latest activity synced from Convex.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/meetings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentMeetings.length === 0 ? (
              <EmptyState
                title="No meetings yet"
                description="Create your first meeting to unlock summaries, chat, and realtime collaboration."
              />
            ) : (
              overview.recentMeetings.map((meeting) => (
                <Link
                  key={meeting._id}
                  href={
                    meeting.status === "ended"
                      ? `/meeting/${meeting._id}/details`
                      : `/meeting/${meeting._id}`
                  }
                  className="flex items-center justify-between border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">{meeting.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {meeting.purpose}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="uppercase">{meeting.status}</p>
                    <p>{new Date(meeting._creationTime).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Live status</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.activeMeeting ? (
              <div className="space-y-3 border border-border p-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Meeting in progress</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {overview.activeMeeting.title}
                </p>
                <Button asChild className="w-full">
                  <Link href={`/meeting/${overview.activeMeeting._id}`}>Join live room</Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No live meeting"
                description="The workspace is quiet right now. Start an instant room when you are ready."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
