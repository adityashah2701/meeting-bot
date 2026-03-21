"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { meetingService, summarizeTranscript } from "@/features/meeting/services/meeting-service";
import type { TranscriptLine } from "@/features/ai/hooks/use-transcription";

export function MeetingSidePanel({
  meetingId,
  transcript,
}: {
  meetingId: Id<"meetings">;
  transcript: TranscriptLine[];
}) {
  const sendMessage = useMutation(meetingService.sendMessage);
  const saveSummary = useMutation(meetingService.saveSummary);
  const participants = useQuery(meetingService.listParticipants, { meetingId }) ?? [];
  const messages = useQuery(meetingService.listMessages, { meetingId }) ?? [];
  const summary = useQuery(meetingService.getSummary, { meetingId });
  const [message, setMessage] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const transcriptPayload = useMemo(
    () => transcript.filter((line) => !line.isInterim).map((line) => ({ sender: line.sender, text: line.text })),
    [transcript],
  );

  const handleSendMessage = async () => {
    if (!message.trim()) {
      return;
    }
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
      const generatedSummary = await summarizeTranscript(transcriptPayload);
      await saveSummary({ meetingId, summary: generatedSummary });
      toast.success("Summary updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to summarize meeting");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <Tabs defaultValue="chat" className="flex h-full flex-col">
        <div className="border-b border-border p-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="insights">AI</TabsTrigger>
            <TabsTrigger value="participants">People</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyState title="No messages yet" description="Chat is live for everyone in the room." />
            ) : (
              messages
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry._id} className="border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{entry.senderName}</p>
                    <p className="mt-1 text-sm text-foreground">{entry.body}</p>
                  </div>
                ))
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Send a message" />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <Button onClick={handleGenerateSummary} disabled={isSummarizing}>
            {isSummarizing ? "Generating..." : "Generate summary"}
          </Button>
          <div className="flex-1 overflow-y-auto border border-border p-4 text-sm text-muted-foreground">
            {summary?.content ?? "No summary yet."}
          </div>
        </TabsContent>

        <TabsContent value="participants" className="flex-1 space-y-3 overflow-y-auto p-4">
          {participants.map((participant) => (
            <div key={participant._id} className="border border-border px-3 py-3">
              <p className="font-medium text-foreground">{participant.name}</p>
              <p className="mt-1 text-xs uppercase text-muted-foreground">
                {participant.isScreenSharing ? "Presenting" : "Joined"}
              </p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="transcript" className="flex-1 space-y-3 overflow-y-auto p-4">
          {transcriptPayload.length === 0 ? (
            <EmptyState title="Transcript empty" description="Start speaking to stream transcript updates." />
          ) : (
            transcript.map((line) => (
              <div key={line.id} className="border border-border px-3 py-3">
                <p className="text-xs text-muted-foreground">{line.sender}</p>
                <p className="mt-1 text-sm text-foreground">{line.text}</p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
