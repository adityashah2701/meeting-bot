"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { meetingService } from "@/features/meeting/services/meeting-service";

export function MeetingsPage() {
  const { organization } = useOrganization();
  const meetings = useQuery(
    meetingService.getMeetings,
    organization?.id ? { orgId: organization.id } : "skip",
  );

  if (meetings === undefined) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-border bg-card p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Meetings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every meeting in this workspace is in realtime.
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Meeting archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meetings.length === 0 ? (
            <EmptyState
              title="No meetings yet"
              description="Create an instant or scheduled meeting to populate the archive."
            />
          ) : (
            meetings.map((meeting) => (
              <Link
                key={meeting._id}
                href={meeting.status === "ended" ? `/meeting/${meeting._id}/details` : `/meeting/${meeting._id}`}
                className="flex items-center justify-between border border-border px-4 py-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium text-foreground">{meeting.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{meeting.purpose}</p>
                </div>
                <div className="flex items-center gap-4 text-xs uppercase text-muted-foreground">
                  <span>{meeting.status}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
