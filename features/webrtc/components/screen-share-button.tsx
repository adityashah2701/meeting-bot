"use client";

import { MonitorUp, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScreenShareButton({
  active,
  onClick,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
    >
      {active ? <MonitorX className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
    </Button>
  );
}
