"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SystemBannerVariant = "locked" | "blocked" | "waiting" | "removed" | "rejected";

type CardConfig = {
  icon: LucideIcon;
  tone: string;
  iconTone: string;
  title: string;
  description: string;
  actionLabel: string;
};

const CARD_CONFIG: Record<"waiting" | "removed" | "rejected", CardConfig> = {
  waiting: {
    icon: ShieldAlert,
    tone: "border-border bg-card",
    iconTone: "text-amber-500",
    title: "Waiting for admission",
    description: "You're in the lobby. A host or co-host needs to admit you before media connects.",
    actionLabel: "Leave room",
  },
  removed: {
    icon: AlertCircle,
    tone: "border-destructive/30 bg-destructive/5",
    iconTone: "text-destructive",
    title: "Meeting access unavailable",
    description: "A host or co-host removed you from this meeting.",
    actionLabel: "Return to meetings",
  },
  rejected: {
    icon: AlertCircle,
    tone: "border-destructive/30 bg-destructive/5",
    iconTone: "text-destructive",
    title: "Meeting access unavailable",
    description: "Your join request was rejected.",
    actionLabel: "Return to meetings",
  },
};

/**
 * Single shared surface for every "system notice" that used to be four
 * ad hoc banner blocks scattered across the room page. `locked`/`blocked`
 * render as a slim inline strip; `waiting`/`removed`/`rejected` render as a
 * centered card that fills the stage area.
 */
export function SystemBanner({
  variant,
  onAction,
}: {
  variant: SystemBannerVariant;
  /** Refresh (blocked) or leave/return (waiting/removed/rejected). */
  onAction?: () => void;
}) {
  if (variant === "locked") {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>The meeting is locked. New participants cannot join until a host unlocks it.</span>
      </div>
    );
  }

  if (variant === "blocked") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          Camera/microphone access is blocked. Click the lock icon in your browser&apos;s address bar,
          allow mic &amp; camera, then{" "}
          <button className="font-medium underline underline-offset-2" onClick={onAction}>
            refresh
          </button>
          .
        </span>
      </div>
    );
  }

  const card = CARD_CONFIG[variant];
  const Icon = card.icon;

  return (
    <div className="flex h-full items-center justify-center">
      <div className={cn("max-w-md rounded-2xl border p-8 text-center", card.tone)}>
        <Icon className={cn("mx-auto h-10 w-10", card.iconTone)} />
        <h2 className="mt-4 text-xl font-semibold text-foreground">{card.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
        <Button className="mt-6" variant="outline" onClick={onAction}>
          {card.actionLabel}
        </Button>
      </div>
    </div>
  );
}
