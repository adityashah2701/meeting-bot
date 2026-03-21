"use client";

import { MonitorUp, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScreenShareButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "secondary" : "outline"} size="icon-lg" onClick={onClick}>
      {active ? <MonitorX className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
    </Button>
  );
}
