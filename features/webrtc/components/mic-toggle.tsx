"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      variant={muted ? "destructive" : "outline"}
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
    >
      {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
