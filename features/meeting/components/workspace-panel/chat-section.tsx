"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { meetingService } from "@/features/meeting/services/meeting-service";

export function ChatSection({ meetingId }: { meetingId: Id<"meetings"> }) {
  const meeting = useQuery(meetingService.getMeeting, { meetingId });
  const messages = useQuery(
    meetingService.listMessages,
    meeting?.currentParticipant?.status === "joined" ? { meetingId } : "skip",
  ) ?? [];
  const sendMessage = useMutation(meetingService.sendMessage);

  const [message, setMessage] = useState("");
  const canSendChat = Boolean(meeting?.effectivePermissions?.canSendChat);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    try {
      await sendMessage({ meetingId, body: message.trim() });
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
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
          placeholder={canSendChat ? "Send a message..." : "Chat is disabled"}
          onKeyDown={(e) => e.key === "Enter" && void handleSendMessage()}
          disabled={!canSendChat}
        />
        <Button onClick={() => void handleSendMessage()} disabled={!canSendChat}>
          Send
        </Button>
      </div>
    </div>
  );
}
