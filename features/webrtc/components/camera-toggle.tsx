"use client";

import { Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CameraToggle({
  off,
  onClick,
}: {
  off: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={off ? "destructive" : "outline"} size="icon-lg" onClick={onClick}>
      {off ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
    </Button>
  );
}
