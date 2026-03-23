"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function MeetingFormSchedule({
  onSubmit,
  isSubmitting,
  googleCalendarConnected,
  googleCalendarAccountEmail,
  connectGoogleCalendarHref,
}: {
  onSubmit: (values: {
    title: string;
    description: string;
    date: string;
    time: string;
    agenda: string;
    timeZone: string;
    syncWithGoogleCalendar: boolean;
  }) => Promise<void>;
  isSubmitting: boolean;
  googleCalendarConnected: boolean;
  googleCalendarAccountEmail?: string;
  connectGoogleCalendarHref?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [agenda, setAgenda] = useState("");
  const [syncWithGoogleCalendar, setSyncWithGoogleCalendar] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    dateTime?: string;
  }>({});

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: {
      title?: string;
      dateTime?: string;
    } = {};

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!date || !time) {
      nextErrors.dateTime = "Date and time are required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      title,
      description,
      date,
      time,
      agenda,
      timeZone: timezone,
      syncWithGoogleCalendar,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Title
        </label>
        <Input
          autoFocus
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (errors.title) {
              setErrors((current) => ({ ...current, title: undefined }));
            }
          }}
          placeholder="Weekly planning sync"
        />
        {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Description
        </label>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional meeting description"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (errors.dateTime) {
                setErrors((current) => ({ ...current, dateTime: undefined }));
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Time
          </label>
          <Input
            type="time"
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              if (errors.dateTime) {
                setErrors((current) => ({ ...current, dateTime: undefined }));
              }
            }}
          />
        </div>
      </div>
      {errors.dateTime ? <p className="text-xs text-destructive">{errors.dateTime}</p> : null}

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Agenda / Notes
        </label>
        <Input
          value={agenda}
          onChange={(event) => setAgenda(event.target.value)}
          placeholder="Optional notes or agenda"
        />
      </div>

      <div className="border border-border bg-card/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Google Calendar
            </p>
            <p className="text-sm text-foreground">
              Create a matching calendar event when this meeting is scheduled.
            </p>
            <p className="text-xs text-muted-foreground">
              {googleCalendarConnected
                ? `Connected as ${googleCalendarAccountEmail ?? "your Google account"}`
                : "Connect Google Calendar first to enable one-click scheduling sync."}
            </p>
          </div>
          <Switch
            checked={syncWithGoogleCalendar}
            disabled={!googleCalendarConnected}
            onCheckedChange={setSyncWithGoogleCalendar}
          />
        </div>

        {!googleCalendarConnected && connectGoogleCalendarHref ? (
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link href={connectGoogleCalendarHref}>Connect Google Calendar</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">Timezone: {timezone}</p>

      <Button
        className="w-full"
        disabled={isSubmitting || !title.trim() || !date || !time}
        type="submit"
      >
        {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
      </Button>
    </form>
  );
}
