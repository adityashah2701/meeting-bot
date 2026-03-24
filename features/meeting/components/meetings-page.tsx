"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Radio,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { meetingService } from "@/features/meeting/services/meeting-service";

type Meeting = {
  _id: string;
  _creationTime: number;
  title: string;
  purpose: string;
  status: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Ended
    </span>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const isActive = meeting.status === "active";
  const href = isActive
    ? `/meeting/${meeting._id}`
    : `/meeting/${meeting._id}/details`;

  const date = new Date(meeting._creationTime);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 px-5 py-4 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/30 hover:shadow-md"
    >
      {/* Icon */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isActive
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isActive ? (
          <Radio className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            {meeting.title}
          </p>
          {isActive && (
            <span className="hidden shrink-0 sm:inline">
              <StatusBadge status={meeting.status} />
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {meeting.purpose || "No description"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <CalendarDays className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Clock className="h-3.5 w-3.5" />
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <StatusBadge status={meeting.status} />
        </div>
        <ChevronRight className="h-4.5 w-4.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

export function MeetingsPage() {
  const { organization } = useOrganization();
  const [search, setSearch] = useState("");

  const meetings = useQuery(
    meetingService.getMeetings,
    organization?.id ? { orgId: organization.id } : "skip",
  );

  if (meetings === undefined) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  const filtered = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.purpose?.toLowerCase().includes(search.toLowerCase()),
  );

  const liveCount = meetings.filter((m) => m.status === "active").length;
  const endedCount = meetings.filter((m) => m.status === "ended").length;

  return (
    <div className="space-y-8">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-linear-to-br from-card via-card to-muted/30 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <Video className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Workspace Archive
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Meetings
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Every meeting is recorded, transcribed and summarised in realtime.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10">
                <FileText className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {meetings.length}
                </p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
            </div>

            {liveCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Radio className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {liveCount}
                  </p>
                  <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                    Live
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {endedCount}
                </p>
                <p className="text-[11px] text-muted-foreground">Archived</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Meeting Archive
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {filtered.length} of {meetings.length} meetings
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings…"
                className="h-9 pl-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {["all", "active", "ended"].map((f) => {
              const count =
                f === "all"
                  ? meetings.length
                  : meetings.filter((m) => m.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSearch(f === "all" ? "" : f)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {f === "active" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px]"
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              title={search ? "No matches found" : "No meetings yet"}
              description={
                search
                  ? "Try a different search term."
                  : "Create an instant or scheduled meeting to populate the archive."
              }
            />
          ) : (
            filtered.map((meeting) => (
              <MeetingCard key={meeting._id} meeting={meeting} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
