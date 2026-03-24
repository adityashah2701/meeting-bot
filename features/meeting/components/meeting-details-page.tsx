/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAction, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/shared/loading-block";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { meetingService } from "@/features/meeting/services/meeting-service";
import { Sparkles, MessageSquare, CalendarDays, Clock, CheckCircle2, Video, BookText, ExternalLink } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type TranscriptRow = {
  _id: string;
  timestamp: number;
  text: string;
  speakerName: string;
};

type RecordingRow = {
  _id: string;
  startedAt: number;
  durationMs?: number;
  status: string;
  playbackUrl?: string | null;
};

function getSyncedTranscriptLine(
  transcriptRows: TranscriptRow[],
  recordingStartedAt: number,
  currentTimeSeconds: number,
) {
  const targetTimestamp = recordingStartedAt + currentTimeSeconds * 1000;
  for (let index = transcriptRows.length - 1; index >= 0; index -= 1) {
    const row = transcriptRows[index];
    if (row.timestamp <= targetTimestamp) {
      return row;
    }
  }
  return null;
}

export function MeetingDetailsPage({ meetingId }: { meetingId: Id<"meetings"> }) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const transcripts = useQuery(meetingService.listTranscripts, { meetingId });
  const recordings = useQuery(meetingService.listRecordings, { meetingId });
  const notionConnection = useQuery(
    meetingService.getNotionConnection,
    meeting?.orgId ? { orgId: meeting.orgId } : "skip",
  );
  const notionExport = useQuery(
    meetingService.getMeetingNotionExport,
    { meetingId },
  );
  const exportMeetingToNotion = useAction(meetingService.exportMeetingToNotion);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [activeRecordingTime, setActiveRecordingTime] = useState(0);
  const [isExportingToNotion, setIsExportingToNotion] = useState(false);

  if (meeting === undefined || transcripts === undefined || recordings === undefined) {
    return <LoadingBlock className="h-96 w-full" />;
  }

  if (!meeting) {
    return <EmptyState title="Meeting not found" description="This meeting no longer exists." />;
  }

  const creationDate = new Date(meeting._creationTime);
  const activeRecording = recordings.find(
    (recording: RecordingRow) => recording._id === activeRecordingId,
  ) ?? null;
  const syncedTranscriptLine = activeRecording
    ? getSyncedTranscriptLine(transcripts, activeRecording.startedAt, activeRecordingTime)
    : null;
  const canExportToNotion = Boolean(
    notionConnection?.connected && notionConnection.targetPageId && !isExportingToNotion,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="relative overflow-hidden flex flex-col gap-4 rounded-3xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge 
              variant={meeting.status === "active" ? "default" : "secondary"} 
              className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
            >
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${meeting.status === "active" ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
              {meeting.status}
            </Badge>
            
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {creationDate.toLocaleDateString(undefined, { 
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {creationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={notionConnection?.connected ? "secondary" : "outline"} className="gap-1.5">
              <BookText className="h-3.5 w-3.5" />
              {notionConnection?.connected
                ? notionConnection.targetPageId
                  ? "Notion ready"
                  : "Notion connected, destination missing"
                : "Notion not connected"}
            </Badge>
            {notionExport?.status ? (
              <Badge variant={notionExport.status === "exported" ? "default" : notionExport.status === "failed" ? "destructive" : "secondary"}>
                {notionExport.status === "exported" ? "Exported to Notion" : notionExport.status === "failed" ? "Notion export failed" : "Export in progress"}
              </Badge>
            ) : null}
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {meeting.title}
          </h1>
          
          {meeting.purpose && (
            <p className="mt-1 text-base leading-relaxed text-muted-foreground max-w-3xl">
              {meeting.purpose}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!canExportToNotion}
              onClick={async () => {
                setIsExportingToNotion(true);
                try {
                  const result = await exportMeetingToNotion({ meetingId });
                  toast.success("Meeting exported to Notion");
                  if (result.pageUrl) {
                    window.open(result.pageUrl, "_blank", "noopener,noreferrer");
                  }
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Unable to export this meeting to Notion",
                  );
                } finally {
                  setIsExportingToNotion(false);
                }
              }}
            >
              {isExportingToNotion ? "Exporting..." : "Export to Notion"}
            </Button>
            <Button
              variant="outline"
              disabled={!notionExport?.externalUrl}
              onClick={() => {
                if (notionExport?.externalUrl) {
                  window.open(notionExport.externalUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Notion Page
            </Button>
            {!notionConnection?.connected ? (
              <p className="text-xs text-muted-foreground">
                Connect Notion from Integrations before exporting this meeting.
              </p>
            ) : null}
            {notionConnection?.connected && !notionConnection.targetPageId ? (
              <p className="text-xs text-muted-foreground">
                Choose a Notion parent page in Integrations before exporting.
              </p>
            ) : null}
            {notionExport?.lastError ? (
              <p className="text-xs text-destructive">
                {notionExport.lastError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[5fr_4fr] xl:grid-cols-[3fr_2fr]">
        {/* Transcript Column */}
        <Card className="flex flex-col border-border/50 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4 pt-5 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                Transcript
              </CardTitle>
              <Badge variant="secondary" className="rounded-full font-medium px-3 bg-muted/50">
                {transcripts.length} messages
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 bg-card">
            <ScrollArea className="h-[650px] w-full px-6 py-4">
              {transcripts.length === 0 ? (
                <EmptyState
                  title="No transcript available"
                  description="Transcription data will appear here once participants start speaking."
                />
              ) : (
                <div className="flex flex-col pb-8 pt-4">
                  {transcripts.map((line: TranscriptRow, idx: number) => {
                    const previousLine = transcripts[idx - 1];
                    const isSameSpeaker = previousLine && previousLine.speakerName === line.speakerName;
                    
                    return (
                      <div key={line._id} className={`flex gap-4 ${isSameSpeaker ? "mt-1.5" : "mt-6 group"}`}>
                        {!isSameSpeaker ? (
                          <Avatar className="h-10 w-10 border border-border/50 shadow-sm shrink-0 mt-0.5">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                              {line.speakerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 shrink-0" /> // spacer
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          {!isSameSpeaker && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {line.speakerName}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground/60 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                                {new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <div className={`text-[15px] text-foreground/90 leading-relaxed ${isSameSpeaker ? "" : ""}`}>
                            {line.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Summary Column */}
        <div className="space-y-6">
        <Card className="flex flex-col border-border/50 shadow-sm overflow-hidden rounded-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          <CardHeader className="border-b border-border/50 bg-primary/5 pb-4 pt-5 px-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 bg-card">
            <ScrollArea className="h-[650px] w-full px-6 py-6">
              {!meeting.summary ? (
                 <div className="flex h-full flex-col items-center justify-center text-center space-y-3 mt-12 text-muted-foreground">
                   <div className="h-12 w-12 rounded-full border border-dashed border-border flex items-center justify-center bg-muted/30">
                     <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-foreground">Pending Summary</p>
                     <p className="text-xs mt-1 max-w-[200px]">The AI is listening and will generate a summary once enough context is available.</p>
                   </div>
                 </div>
              ) : (
                <div className="prose-sm max-w-none pb-8">
                  {meeting.summary && (
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}: React.HTMLAttributes<HTMLHeadingElement> & {node?: unknown}) => <h1 className="mt-2 mb-6 text-2xl font-bold text-foreground tracking-tight" {...props} />,
                        h2: ({node, ...props}: React.HTMLAttributes<HTMLHeadingElement> & {node?: unknown}) => <h2 className="mt-8 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80 border-b border-border/40 pb-2" {...props} />,
                        h3: ({node, ...props}: React.HTMLAttributes<HTMLHeadingElement> & {node?: unknown}) => <h3 className="mt-6 mb-2 text-lg font-semibold text-foreground tracking-tight" {...props} />,
                        p: ({node, ...props}: React.HTMLAttributes<HTMLParagraphElement> & {node?: unknown}) => <p className="mb-4 text-[15px] leading-relaxed text-foreground/80 last:mb-0" {...props} />,
                        ul: ({node, ...props}: React.HTMLAttributes<HTMLUListElement> & {node?: unknown}) => <ul className="mb-6 ml-4 list-outside list-disc space-y-2.5 text-[15px] text-foreground/80 marker:text-primary/70" {...props} />,
                        ol: ({node, ...props}: React.HTMLAttributes<HTMLOListElement> & {node?: unknown}) => <ol className="mb-6 ml-4 list-outside list-decimal space-y-2.5 text-[15px] text-foreground/80 marker:text-primary/70 font-medium" {...props} />,
                        li: ({node, ...props}: React.HTMLAttributes<HTMLLIElement> & {node?: unknown}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}: React.HTMLAttributes<HTMLElement> & {node?: unknown}) => <strong className="font-semibold text-foreground" {...props} />,
                        blockquote: ({node, ...props}: React.HTMLAttributes<HTMLElement> & {node?: unknown}) => <blockquote className="border-l-4 border-primary/40 bg-primary/5 px-4 py-3 rounded-r-xl italic text-foreground/80 mb-6 shadow-sm" {...props} />
                      }}
                    >
                      {meeting.summary}
                    </ReactMarkdown>
                  )}

                  {/* Custom UI for Key Points */}
                  {meeting.key_points && meeting.key_points.length > 0 && (
                    <div className="mt-8">
                      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80 border-b border-border/40 pb-2">Key Points</h2>
                      <ul className="space-y-2.5 ml-1">
                        {meeting.key_points.map((point: string, i: number) => (
                          <li key={i} className="flex gap-3 text-[15px] text-foreground/80">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Custom UI for Decisions */}
                  {meeting.decisions && meeting.decisions.length > 0 && (
                    <div className="mt-8">
                      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80 border-b border-border/40 pb-2">Decisions</h2>
                      <ul className="space-y-2.5 ml-1">
                        {meeting.decisions.map((dec: string, i: number) => (
                          <li key={i} className="flex gap-3 text-[15px] text-foreground/80">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500/80" />
                            {dec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Custom UI for Action Items */}
                  {meeting.action_items && meeting.action_items.length > 0 && (
                    <div className="mt-8">
                      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80 border-b border-border/40 pb-2">Action Items</h2>
                      <div className="space-y-3">
                        {meeting.action_items.map((item: { task: string; assignee?: string | null; due?: string | null }, i: number) => (
                          <div key={i} className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 shadow-sm">
                            <p className="font-semibold text-foreground/90 text-[15px]">{item.task}</p>
                            {(item.assignee || item.due) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.assignee && (
                                  <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0 h-5">
                                    {item.assignee}
                                  </Badge>
                                )}
                                {item.due && (
                                  <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground px-2 py-0 h-5 border-border/50">
                                    {item.due}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4 pt-5 px-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Video className="h-5 w-5 text-muted-foreground" />
              Recordings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {recordings.length === 0 ? (
              <EmptyState
                title="No recordings yet"
                description="When hosts or co-hosts record this meeting, entries will appear here."
              />
            ) : (
              recordings.map((recording: RecordingRow) => (
                <div key={recording._id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      Recording · {new Date(recording.startedAt).toLocaleString()}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {recording.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Duration: {recording.durationMs ? `${Math.round(recording.durationMs / 1000)}s` : "Processing"}
                  </p>
                  {recording.playbackUrl ? (
                    <video
                      controls
                      src={recording.playbackUrl}
                      className="w-full rounded-md border border-border"
                      onPlay={() => setActiveRecordingId(recording._id)}
                      onPause={() => setActiveRecordingId((current) => (current === recording._id ? null : current))}
                      onTimeUpdate={(event) => {
                        if (activeRecordingId !== recording._id) {
                          setActiveRecordingId(recording._id);
                        }
                        setActiveRecordingTime(event.currentTarget.currentTime);
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Playback URL not available yet. Recording metadata is saved and awaiting media upload/processing.
                    </p>
                  )}
                  {activeRecordingId === recording._id ? (
                    <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Synced Context
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {syncedTranscriptLine
                          ? `${syncedTranscriptLine.speakerName}: ${syncedTranscriptLine.text}`
                          : "No transcript line matched at this timestamp yet."}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Summary: {meeting.summary ? "Available" : "Pending"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
