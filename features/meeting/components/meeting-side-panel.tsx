"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  meetingService,
  summarizeTranscript,
  type MeetingSummaryResult,
} from "@/features/meeting/services/meeting-service";
import type {
  TranscriptLine,
  TranscriptionMode,
} from "@/features/ai/hooks/use-transcription";

export function MeetingSidePanel({
  meetingId,
  transcript,
  orgId,
  isActivelyTranscribing = false,
  transcriptionMode,
  onTranscriptionModeChange,
}: {
  meetingId: Id<"meetings">;
  transcript: TranscriptLine[];
  orgId: string;
  isActivelyTranscribing?: boolean;
  transcriptionMode: TranscriptionMode;
  onTranscriptionModeChange: (mode: TranscriptionMode) => void;
}) {
  const sendMessage = useMutation(meetingService.sendMessage);
  const saveSummary = useMutation(meetingService.saveSummary);
  const createTasksFromSummary = useMutation(meetingService.createTasksFromSummary);
  const participants = useQuery(meetingService.listParticipants, { meetingId }) ?? [];
  const messages = useQuery(meetingService.listMessages, { meetingId }) ?? [];
  const summaryAsset = useQuery(meetingService.getSummary, { meetingId });

  const [message, setMessage] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [structuredResult, setStructuredResult] = useState<MeetingSummaryResult | null>(null);

  const transcriptPayload = useMemo(
    () =>
      transcript
        .filter((line) => !line.isInterim)
        .map((line) => ({ sender: line.sender, text: line.text })),
    [transcript],
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage({ meetingId, body: message.trim() });
    setMessage("");
  };

  const handleGenerateSummary = async () => {
    if (transcriptPayload.length === 0) {
      toast.error("Wait for transcript data before generating a summary");
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeTranscript(transcriptPayload);
      setStructuredResult(result);
      await saveSummary({ meetingId, summary: result.summary });

      if (result.actionItems.length > 0) {
        await createTasksFromSummary({ orgId, meetingId, titles: result.actionItems });
        toast.success(`Summary saved · ${result.actionItems.length} task(s) created`);
      } else {
        toast.success("Summary saved");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to summarize meeting");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Prefer structured result from current session; fall back to persisted summary text
  const displaySummary = structuredResult?.summary ?? summaryAsset?.content ?? null;
  const keyPoints = structuredResult?.key_points ?? [];
  const decisions = structuredResult?.decisions ?? [];
  const actionItems = structuredResult?.action_items ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b border-border p-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Chat ── */}
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col p-4">
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <EmptyState title="No messages yet" description="Chat is live for everyone in the room." />
              ) : (
                messages
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry._id} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{entry.senderName}</p>
                      <p className="mt-1 text-sm text-foreground">{entry.body}</p>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
          <div className="mt-4 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a message…"
              onKeyDown={(e) => e.key === "Enter" && void handleSendMessage()}
            />
            <Button onClick={() => void handleSendMessage()}>Send</Button>
          </div>
        </TabsContent>

        {/* ── AI Summary ── */}
        <TabsContent value="ai" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 p-4">
          <Button
            onClick={() => void handleGenerateSummary()}
            disabled={isSummarizing}
            className="w-full gap-2"
            variant={displaySummary ? "outline" : "default"}
          >
            {isSummarizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is generating summary…
              </>
            ) : displaySummary ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate summary
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate summary
              </>
            )}
          </Button>

          <ScrollArea className="min-h-0 flex-1">
            {!displaySummary && !isSummarizing ? (
              <EmptyState
                title="No summary yet"
                description="Generate a summary to see key points, decisions, and action items."
              />
            ) : isSummarizing ? (
              <div className="flex flex-col items-center gap-3 pt-10 text-center text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Analyzing transcript…</p>
              </div>
            ) : (
              <div className="space-y-5 pr-2 text-sm">
                {/* Summary */}
                {displaySummary && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Overview
                    </p>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{displaySummary}</p>
                  </div>
                )}

                {/* Key Points */}
                {keyPoints.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Key Points
                    </p>
                    <ul className="space-y-1.5">
                      {keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-foreground">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {decisions.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Decisions
                    </p>
                    <ul className="space-y-1.5">
                      {decisions.map((dec, i) => (
                        <li key={i} className="flex gap-2 text-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                          {dec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {actionItems.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action Items
                    </p>
                    <div className="space-y-2">
                      {actionItems.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-border bg-background px-3 py-2"
                        >
                          <p className="font-medium text-foreground">{item.task}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {item.assignee && (
                              <Badge variant="secondary" className="text-xs">
                                {item.assignee}
                              </Badge>
                            )}
                            {item.due && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                {item.due}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── People ── */}
        <TabsContent value="people" className="mt-0 min-h-0 flex-1 p-4">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p._id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  {p.isScreenSharing && (
                    <Badge variant="secondary" className="text-xs">Presenting</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Transcript ── */}
        <TabsContent value="transcript" className="mt-0 min-h-0 flex h-full flex-1 flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transcription Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Use `Hindi + English` for Hinglish speech.
              </p>
            </div>
            <Select
              value={transcriptionMode}
              onValueChange={(value) =>
                onTranscriptionModeChange(value as TranscriptionMode)
              }
            >
              <SelectTrigger className="min-w-36" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="hinglish">Hindi + English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-2">
              {transcript.length === 0 ? (
                isActivelyTranscribing ? (
                  <div className="flex flex-col items-center gap-2 pt-8 text-center text-sm text-muted-foreground">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </span>
                    <p className="font-medium text-foreground">Listening…</p>
                    <p className="max-w-xs text-xs">Start speaking clearly. Text will appear here as soon as words are detected.</p>
                  </div>
                ) : (
                  <EmptyState title="Transcript empty" description="Unmute your mic and start speaking to stream transcript updates." />
                )
              ) : (
                transcript.map((line) => (
                  <div
                    key={line.id}
                    className={`rounded-md border px-3 py-2 transition-opacity ${
                      line.isInterim ? "border-border/50 opacity-60 italic" : "border-border"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">{line.sender}</p>
                    <p className="mt-0.5 text-sm text-foreground">{line.text}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
