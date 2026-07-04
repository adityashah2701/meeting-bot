"use client";

import { Captions } from "lucide-react";
import { cn } from "@/lib/utils";

type CaptionLine = {
  id: string;
  sender: string;
  text: string;
};

/**
 * The one place live transcript shows up on the stage. Replaces the old
 * floating-transcript overlay (which duplicated the panel's Transcript tab
 * with its own dock-position picker) — this strip only ever shows the most
 * recent line and fades out the moment no one is talking. Clicking it opens
 * the workspace panel's Transcript section for full history.
 */
export function LiveCaptionStrip({
  line,
  onExpand,
}: {
  line: CaptionLine | null;
  onExpand: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none mx-auto flex max-w-xl justify-center transition-all duration-(--meeting-motion-medium) ease-(--meeting-ease-out)",
        line ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
      )}
    >
      {line && (
        <button
          type="button"
          onClick={onExpand}
          className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2 text-left shadow-sm backdrop-blur transition-colors hover:bg-muted"
        >
          <Captions className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{line.sender}</span>
            {" · "}
            {line.text}
          </span>
        </button>
      )}
    </div>
  );
}
