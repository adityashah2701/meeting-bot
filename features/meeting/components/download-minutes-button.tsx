"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadMinutesDocument,
  type MinutesDocumentData,
} from "@/features/meeting/lib/minutes-document";

type DownloadMinutesButtonProps = React.ComponentProps<typeof Button> & {
  meeting: MinutesDocumentData;
  label?: string;
};

export function DownloadMinutesButton({
  meeting,
  label = "Download MoM",
  disabled,
  onClick,
  ...props
}: DownloadMinutesButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const hasMinutes = Boolean(meeting.summary?.trim());

  return (
    <Button
      disabled={disabled || isDownloading || !hasMinutes}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        setIsDownloading(true);
        try {
          const fileName = downloadMinutesDocument(meeting);
          toast.success(`${fileName} downloaded`);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to prepare the minutes document",
          );
        } finally {
          setIsDownloading(false);
        }
      }}
      {...props}
    >
      <FileDown className="h-3.5 w-3.5" />
      {isDownloading ? "Preparing..." : label}
    </Button>
  );
}
