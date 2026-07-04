"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MicToggle({
  muted,
  onClick,
  disabled = false,
}: {
  muted: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl cursor-pointer",
        muted &&
          "border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background",
      )}
      aria-pressed={muted}
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
