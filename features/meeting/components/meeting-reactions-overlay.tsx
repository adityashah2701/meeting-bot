"use client";

import { useEffect, useMemo, useState } from "react";

type MeetingReaction = {
  _id: string;
  senderName: string;
  emoji: string;
  createdAt: number;
};

const REACTION_TTL_MS = 5000;

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getReactionStyle(reaction: MeetingReaction) {
  const hash = hashString(`${reaction._id}:${reaction.senderName}:${reaction.createdAt}`);
  const x = 58 + (hash % 28);
  const duration = 4200 + (hash % 900);
  const delay = (hash % 4) * 90;
  const drift = ((hash >> 3) % 36) - 18;
  const rotation = ((hash >> 5) % 20) - 10;
  const scale = 0.96 + (((hash >> 7) % 10) / 100);

  return {
    "--reaction-x": `${x}%`,
    "--reaction-drift": `${drift}px`,
    "--reaction-duration": `${duration}ms`,
    "--reaction-delay": `${delay}ms`,
    "--reaction-rotation": `${rotation}deg`,
    "--reaction-scale": `${scale}`,
  } as React.CSSProperties;
}

export function MeetingReactionsOverlay({
  reactions,
}: {
  reactions: MeetingReaction[];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (reactions.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [reactions.length]);

  const visibleReactions = useMemo(
    () =>
      reactions.filter((reaction) => now - reaction.createdAt <= REACTION_TTL_MS),
    [now, reactions],
  );

  if (visibleReactions.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {visibleReactions.map((reaction) => (
        <div
          key={reaction._id}
          className="meeting-reaction-float absolute bottom-16 left-0"
          style={getReactionStyle(reaction)}
        >
          <div className="meeting-reaction-bubble flex items-center gap-2 rounded-full border border-white/25 bg-background/80 px-3 py-2 shadow-xl backdrop-blur-md">
            <span className="text-2xl leading-none">{reaction.emoji}</span>
            <span className="max-w-28 truncate text-xs font-medium text-foreground/90">
              {reaction.senderName}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
