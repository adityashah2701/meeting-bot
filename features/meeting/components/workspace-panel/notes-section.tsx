/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

function storageKey(meetingId: Id<"meetings">) {
  return `meeting-notes:${meetingId}`;
}

export function NotesSection({ meetingId }: { meetingId: Id<"meetings"> }) {
  const [value, setValue] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(window.localStorage.getItem(storageKey(meetingId)) ?? "");
  }, [meetingId]);

  const handleChange = (next: string) => {
    setValue(next);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      window.localStorage.setItem(storageKey(meetingId), next);
      setSavedAt(Date.now());
    }, 400);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your notes
        </p>
        <p className="text-xs text-muted-foreground">
          {savedAt ? "Saved" : "Only visible to you"}
        </p>
      </div>
      <textarea
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Jot down anything worth remembering from this meeting..."
        className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
