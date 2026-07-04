"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import type { TranscriptLine, TranscriptionMode } from "@/features/ai/hooks/use-transcription";

export function TranscriptSection({
  transcript,
  isActivelyTranscribing = false,
  transcriptionMode,
  onTranscriptionModeChange,
}: {
  transcript: TranscriptLine[];
  isActivelyTranscribing?: boolean;
  transcriptionMode: TranscriptionMode;
  onTranscriptionModeChange: (mode: TranscriptionMode) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transcription Mode
          </p>
          <p className="text-xs text-muted-foreground">Use `Hindi + English` for Hinglish speech.</p>
        </div>
        <Select value={transcriptionMode} onValueChange={(value) => onTranscriptionModeChange(value as TranscriptionMode)}>
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
                <p className="font-medium text-foreground">Listening...</p>
                <p className="max-w-xs text-xs">
                  Start speaking clearly. Text will appear here as soon as words are detected.
                </p>
              </div>
            ) : (
              <EmptyState
                title="Transcript empty"
                description="Unmute your mic and start speaking to stream transcript updates."
              />
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
    </div>
  );
}
