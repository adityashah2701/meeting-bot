"use client";

import { Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      variant={off ? "destructive" : "outline"}
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
    >
      {off ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
    </Button>
  );
}
