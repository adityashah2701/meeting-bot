"use client";

import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/shared/loading-block";
import { EmptyState } from "@/components/shared/empty-state";
import { meetingService } from "@/features/meeting/services/meeting-service";

export function MeetingDetailsPage({ meetingId }: { meetingId: Id<"meetings"> }) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const transcripts = useQuery(meetingService.listTranscripts, { meetingId });

  if (meeting === undefined || transcripts === undefined) {
    return <LoadingBlock className="h-96 w-full" />;
  }

  if (!meeting) {
    return <EmptyState title="Meeting not found" description="This meeting no longer exists." />;
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{meeting.status}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{meeting.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{meeting.purpose}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transcripts.length === 0 ? (
              <EmptyState
                title="No transcript available"
                description="Transcription data will appear here once people speak in the room."
              />
            ) : (
              transcripts.map((line) => (
                <div key={line._id} className="border border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{line.speakerName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{line.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {meeting.summary ? meeting.summary : "No AI summary has been generated for this meeting yet."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
