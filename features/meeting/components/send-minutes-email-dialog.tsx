"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MinutesDocumentData } from "@/features/meeting/lib/minutes-document";

type SendMinutesEmailDialogProps = Pick<
  React.ComponentProps<typeof Button>,
  "size" | "variant"
> & {
  meeting: MinutesDocumentData;
  organizationId?: string | null;
};

function parseRecipientEmails(value: string) {
  return [...new Set(
    value
      .split(/[,\s\n;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDefaultSubject(meeting: MinutesDocumentData) {
  return `Minutes of Meeting: ${meeting.title}`;
}

function getDefaultTopic(meeting: MinutesDocumentData) {
  return meeting.purpose?.trim() || meeting.title;
}

export function SendMinutesEmailDialog({
  meeting,
  organizationId,
  size = "sm",
  variant = "default",
}: SendMinutesEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState("");
  const [subject, setSubject] = useState(getDefaultSubject(meeting));
  const [topic, setTopic] = useState(getDefaultTopic(meeting));
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const hasMinutes = Boolean(meeting.summary?.trim());

  const resetForm = () => {
    setRecipientEmails("");
    setSubject(getDefaultSubject(meeting));
    setTopic(getDefaultTopic(meeting));
    setMessage("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organizationId) {
      toast.error("Select an organization first.");
      return;
    }

    if (!hasMinutes) {
      toast.error("Minutes are not available for this meeting yet.");
      return;
    }

    const recipients = parseRecipientEmails(recipientEmails);
    if (recipients.length === 0) {
      toast.error("Add at least one recipient email.");
      return;
    }

    const invalidEmail = recipients.find((email) => !isValidEmail(email));
    if (invalidEmail) {
      toast.error(`Invalid recipient email: ${invalidEmail}`);
      return;
    }

    if (!subject.trim()) {
      toast.error("Add an email subject.");
      return;
    }

    if (!topic.trim()) {
      toast.error("Add an email topic.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/minutes/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: organizationId,
          toEmail: recipients.join(", "),
          subject,
          topic,
          message,
          meeting,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to send minutes email");
      }

      toast.success("Minutes document sent successfully.");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send minutes email",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={!hasMinutes} size={size} variant={variant}>
          <Mail className="h-3.5 w-3.5" />
          Send via email
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send minutes document</DialogTitle>
          <DialogDescription>
            The professional minutes document will be attached automatically as a Word file.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="minutes-email-to">Recipient email</Label>
            <Input
              id="minutes-email-to"
              autoFocus
              value={recipientEmails}
              onChange={(event) => setRecipientEmails(event.target.value)}
              placeholder="alex@company.com, team@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Comma, space, or semicolon separated emails are supported.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minutes-email-subject">Subject</Label>
            <Input
              id="minutes-email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Minutes of Meeting: Product Review"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minutes-email-topic">Topic</Label>
            <Input
              id="minutes-email-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Weekly product review"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minutes-email-message">Message (optional)</Label>
            <Textarea
              id="minutes-email-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Sharing the attached minutes for your review."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSending || !hasMinutes}>
              <Send className="h-3.5 w-3.5" />
              {isSending ? "Sending..." : "Send document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
