"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, ExternalLink, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingBlock } from "@/components/shared/loading-block";
import { integrationsService } from "@/features/integrations/services/integrations-service";

function formatTimestamp(value?: number) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat([], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const disconnectGoogleCalendar = useMutation(
    integrationsService.disconnectGoogleCalendar,
  );
  const googleCalendarConnection = useQuery(
    integrationsService.getGoogleCalendarConnection,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const connectHref = useMemo(() => {
    if (!organization?.id) {
      return "/integrations";
    }

    const params = new URLSearchParams({
      orgId: organization.id,
      returnTo: "/integrations",
    });

    return `/api/integrations/google/start?${params.toString()}`;
  }, [organization?.id]);

  useEffect(() => {
    const calendarStatus = searchParams.get("googleCalendar");
    if (!calendarStatus) {
      return;
    }

    if (calendarStatus === "connected") {
      toast.success("Google Calendar connected");
    } else if (calendarStatus === "missing-config") {
      toast.error("Google Calendar environment variables are missing");
    } else if (calendarStatus === "token-error") {
      toast.error("Unable to exchange the Google authorization code");
    } else if (calendarStatus === "profile-error") {
      toast.error("Unable to read your Google account email");
    } else if (calendarStatus === "access-denied") {
      toast.error("Google Calendar access was denied");
    } else {
      toast.error("Google Calendar connection failed");
    }

    router.replace("/integrations");
  }, [router, searchParams]);

  if (!organization || googleCalendarConnection === undefined) {
    return <LoadingBlock className="h-96 w-full" />;
  }

  const isConnected = googleCalendarConnection.connected;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Integrations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Connect scheduling workflows
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Start with Google Calendar so scheduled meetings create live calendar events,
          include invitees, and stay discoverable outside the app.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card className="border border-border/80 bg-card/80">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center border border-border bg-background">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Google Calendar</CardTitle>
                    <CardDescription>
                      Sync scheduled meetings into the host&apos;s primary calendar.
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Badge variant={isConnected ? "default" : "outline"}>
                {isConnected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 pt-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Account
                </p>
                <p className="text-sm text-foreground">
                  {googleCalendarConnection.accountEmail ?? "No Google account connected yet"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Last updated
                </p>
                <p className="text-sm text-foreground">
                  {formatTimestamp(googleCalendarConnection.updatedAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Access token expires
                </p>
                <p className="text-sm text-foreground">
                  {formatTimestamp(googleCalendarConnection.tokenExpiresAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Connection state
                </p>
                <p className="text-sm text-foreground">
                  {googleCalendarConnection.status ?? "disconnected"}
                </p>
                {googleCalendarConnection.lastError ? (
                  <p className="text-xs text-destructive">
                    {googleCalendarConnection.lastError}
                  </p>
                ) : null}
                {googleCalendarConnection.warning ? (
                  <p className="text-xs text-amber-600">
                    {googleCalendarConnection.warning}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  What this enables
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>Create a calendar event when the host schedules a meeting.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Link2 className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>Attach meeting join links and invited attendees automatically.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>Keep the connection ready for follow-up event updates.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Granted scopes
                </p>
                <div className="flex flex-wrap gap-2">
                  {(googleCalendarConnection.scope ?? []).length > 0 ? (
                    googleCalendarConnection.scope?.map((scope: string) => (
                      <Badge key={scope} variant="outline" className="max-w-full truncate">
                        {scope}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Scopes will appear after a successful connection.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Debug checks
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p>
                    Refresh token stored: {googleCalendarConnection.hasRefreshToken ? "yes" : "no"}
                  </p>
                  <p>
                    Convex Google client env: {googleCalendarConnection.hasGoogleClientId && googleCalendarConnection.hasGoogleClientSecret ? "configured" : "missing"}
                  </p>
                  <p>
                    Public app URL: {googleCalendarConnection.publicAppUrlConfigured ? googleCalendarConnection.publicAppUrl : "missing"}
                  </p>
                  <p>
                    Extra calendar env present: {googleCalendarConnection.hasConfiguredCalendarId ? "yes" : "no"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Connection is scoped to your user account and can be reused across meetings in this workspace.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isConnected ? "outline" : "default"}>
                <Link href={connectHref}>
                  {isConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={!isConnected || isDisconnecting}
                onClick={async () => {
                  if (!organization?.id) {
                    return;
                  }

                  setIsDisconnecting(true);
                  try {
                    await disconnectGoogleCalendar({ orgId: organization.id });
                    toast.success("Google Calendar disconnected");
                  } catch {
                    toast.error("Unable to disconnect Google Calendar");
                  } finally {
                    setIsDisconnecting(false);
                  }
                }}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="border border-border/80 bg-card/60">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Implementation status</CardTitle>
            <CardDescription>
              The first usable Google Calendar slice is now wired into scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Live now
              </p>
              <div className="grid gap-2 text-sm text-foreground">
                <p>OAuth connect and disconnect flow</p>
                <p>Per-user Google connection state</p>
                <p>Scheduled-meeting sync toggle</p>
                <p>Background event creation after meeting scheduling</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Next recommended steps
              </p>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>Event update and cancellation sync</p>
                <p>Attendee import from existing calendar events</p>
                <p>Open in Google Calendar from meeting details</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank">
                Open Google Cloud setup
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
