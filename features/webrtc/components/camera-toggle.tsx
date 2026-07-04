"use client";

import { Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CameraToggle({
  off,
  onClick,
  disabled = false,
}: {
  off: boolean;
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
        off &&
          "border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background",
      )}
      aria-pressed={off}
      title={off ? "Turn camera on" : "Turn camera off"}
    >
      {off ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
    </Button>
  );
}
