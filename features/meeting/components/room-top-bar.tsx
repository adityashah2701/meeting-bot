"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Mic, MicOff, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RoomAiStatus = "transcribing" | "blocked" | "idle";

const MAX_VISIBLE_AVATARS = 4;

function useElapsed(startedAt?: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Slim identity-only bar. Nothing here changes call state — recording, mic,
 * camera, and screen share all live in the command bar — so this row never
 * competes with the controls a user is actively reaching for.
 */
export function RoomTopBar({
  title,
  isLive,
  startedAt,
  participants,
  aiStatus,
  isSidebarOpen,
  onToggleSidebar,
}: {
  title: string;
  isLive: boolean;
  startedAt?: number | null;
  participants: Array<{ _id: string; name: string; imageUrl?: string }>;
  aiStatus: RoomAiStatus;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const elapsed = useElapsed(isLive ? startedAt : null);
  const visible = participants.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = participants.length - visible.length;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
        {isLive && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span>Live{elapsed ? ` · ${elapsed}` : ""}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {visible.length > 0 && (
          <AvatarGroup className="hidden sm:flex">
            {visible.map((p) => (
              <Avatar key={p._id} size="sm">
                <AvatarImage src={p.imageUrl} alt={p.name} />
                <AvatarFallback className="text-[10px] font-medium">
                  {p.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
          </AvatarGroup>
        )}

        <AiStatusChip status={aiStatus} />

        <Button
          size="icon-sm"
          variant="ghost"
          className="rounded-full"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide panel" : "Show panel"}
        >
          {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

function AiStatusChip({ status }: { status: RoomAiStatus }) {
  if (status === "blocked") {
    return (
      <div
        className="hidden items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive sm:flex"
        title="Microphone access denied"
      >
        <AlertCircle className="h-3 w-3" />
        <span>Mic blocked</span>
      </div>
    );
  }

  if (status === "transcribing") {
    return (
      <div
        className="hidden items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 sm:flex dark:text-green-400"
        title="Transcription active"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <Mic className="h-3 w-3" />
        <span>Transcribing</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:flex",
      )}
      title="Transcription paused"
    >
      <MicOff className="h-3 w-3" />
      <span>Mic off</span>
    </div>
  );
}
