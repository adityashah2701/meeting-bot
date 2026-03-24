"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { BookText, CalendarDays, Link2, RefreshCw, ShieldCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
  const disconnectNotion = useMutation(
    integrationsService.disconnectNotion,
  );
  const updateNotionTargetPage = useMutation(
    integrationsService.updateNotionTargetPage,
  );
  const googleCalendarConnection = useQuery(
    integrationsService.getGoogleCalendarConnection,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const notionConnection = useQuery(
    integrationsService.getNotionConnection,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  const [isDisconnectingNotion, setIsDisconnectingNotion] = useState(false);
  const [isSavingNotionTarget, setIsSavingNotionTarget] = useState(false);
  const [notionTargetInput, setNotionTargetInput] = useState("");

  const connectGoogleHref = useMemo(() => {
    if (!organization?.id) {
      return "/integrations";
    }

    const params = new URLSearchParams({
      orgId: organization.id,
      returnTo: "/integrations",
    });

    return `/api/integrations/google/start?${params.toString()}`;
  }, [organization?.id]);

  const connectNotionHref = useMemo(() => {
    if (!organization?.id) {
      return "/integrations";
    }

    const params = new URLSearchParams({
      orgId: organization.id,
      returnTo: "/integrations",
    });

    return `/api/integrations/notion/start?${params.toString()}`;
  }, [organization?.id]);

  useEffect(() => {
    const calendarStatus = searchParams.get("googleCalendar");
    const notionStatus = searchParams.get("notion");
    let shouldReplace = false;

    if (calendarStatus) {
      shouldReplace = true;
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
    }

    if (notionStatus) {
      shouldReplace = true;
      if (notionStatus === "connected") {
        toast.success("Notion connected");
      } else if (notionStatus === "missing-config") {
        toast.error("Notion environment variables are missing");
      } else if (notionStatus === "token-error") {
        toast.error("Unable to exchange the Notion authorization code");
      } else if (notionStatus === "access-denied") {
        toast.error("Notion access was denied");
      } else {
        toast.error("Notion connection failed");
      }
    }

    if (shouldReplace) {
      router.replace("/integrations");
    }
  }, [router, searchParams]);

  useEffect(() => {
    setNotionTargetInput(notionConnection?.targetPageId ?? "");
  }, [notionConnection?.targetPageId]);

  if (!organization || googleCalendarConnection === undefined || notionConnection === undefined) {
    return <LoadingBlock className="h-96 w-full" />;
  }

  const isGoogleConnected = googleCalendarConnection.connected;
  const isNotionConnected = notionConnection.connected;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Integrations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Connect team workflows
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Keep scheduling and meeting knowledge connected. Google Calendar covers scheduling,
          while Notion gives every meeting a durable home for summaries, decisions, action items,
          and transcripts.
        </p>
      </div>

      <div className="grid gap-6">
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
              <Badge variant={isGoogleConnected ? "default" : "outline"}>
                {isGoogleConnected ? "Connected" : "Not connected"}
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
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Connection is scoped to your user account and can be reused across meetings in this workspace.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isGoogleConnected ? "outline" : "default"}>
                <Link href={connectGoogleHref}>
                  {isGoogleConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={!isGoogleConnected || isDisconnectingGoogle}
                onClick={async () => {
                  if (!organization?.id) {
                    return;
                  }

                  setIsDisconnectingGoogle(true);
                  try {
                    await disconnectGoogleCalendar({ orgId: organization.id });
                    toast.success("Google Calendar disconnected");
                  } catch {
                    toast.error("Unable to disconnect Google Calendar");
                  } finally {
                    setIsDisconnectingGoogle(false);
                  }
                }}
              >
                {isDisconnectingGoogle ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="border border-border/80 bg-card/80">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center border border-border bg-background">
                    <BookText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Notion</CardTitle>
                    <CardDescription>
                      Export completed meetings into a Notion page under a workspace page you choose.
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Badge variant={isNotionConnected ? "default" : "outline"}>
                {isNotionConnected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 pt-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Workspace
                </p>
                <p className="text-sm text-foreground">
                  {notionConnection.workspaceName ?? "No Notion workspace connected yet"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Parent page
                </p>
                <p className="text-sm text-foreground break-all">
                  {notionConnection.targetPageId ?? "Choose a parent page before exporting meetings"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Last updated
                </p>
                <p className="text-sm text-foreground">
                  {formatTimestamp(notionConnection.updatedAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Connection state
                </p>
                <p className="text-sm text-foreground">
                  {notionConnection.status ?? "disconnected"}
                </p>
                {notionConnection.lastError ? (
                  <p className="text-xs text-destructive">
                    {notionConnection.lastError}
                  </p>
                ) : null}
                {notionConnection.warning ? (
                  <p className="text-xs text-amber-600">
                    {notionConnection.warning}
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
                    <span>Create a dedicated Notion page for a meeting after it ends.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Link2 className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>Ship the AI summary, action items, transcript, and recording links together.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>Reuse the same destination page for future exports in this workspace.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Export destination
                </p>
                <Input
                  value={notionTargetInput}
                  onChange={(event) => setNotionTargetInput(event.target.value)}
                  placeholder="Paste a Notion page URL or page ID"
                  disabled={!isNotionConnected}
                />
                <p className="text-xs text-muted-foreground">
                  Start by sharing a page with your integration in Notion, then paste that page URL here.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!isNotionConnected || isSavingNotionTarget}
                    onClick={async () => {
                      if (!organization?.id) {
                        return;
                      }

                      setIsSavingNotionTarget(true);
                      try {
                        await updateNotionTargetPage({
                          orgId: organization.id,
                          targetPageId: notionTargetInput.trim() || null,
                        });
                        toast.success(
                          notionTargetInput.trim()
                            ? "Notion export destination saved"
                            : "Notion export destination cleared",
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Unable to save the Notion export destination",
                        );
                      } finally {
                        setIsSavingNotionTarget(false);
                      }
                    }}
                  >
                    {isSavingNotionTarget ? "Saving..." : "Save destination"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!isNotionConnected || !notionConnection.targetPageId || isSavingNotionTarget}
                    onClick={async () => {
                      if (!organization?.id) {
                        return;
                      }

                      setIsSavingNotionTarget(true);
                      try {
                        await updateNotionTargetPage({
                          orgId: organization.id,
                          targetPageId: null,
                        });
                        setNotionTargetInput("");
                        toast.success("Notion export destination cleared");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Unable to clear the Notion export destination",
                        );
                      } finally {
                        setIsSavingNotionTarget(false);
                      }
                    }}
                  >
                    Clear destination
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Connection is scoped to your user account inside this workspace. Exports create new child pages under the parent page you configure.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isNotionConnected ? "outline" : "default"}>
                <Link href={connectNotionHref}>
                  {isNotionConnected ? "Reconnect Notion" : "Connect Notion"}
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={!isNotionConnected || isDisconnectingNotion}
                onClick={async () => {
                  if (!organization?.id) {
                    return;
                  }

                  setIsDisconnectingNotion(true);
                  try {
                    await disconnectNotion({ orgId: organization.id });
                    setNotionTargetInput("");
                    toast.success("Notion disconnected");
                  } catch {
                    toast.error("Unable to disconnect Notion");
                  } finally {
                    setIsDisconnectingNotion(false);
                  }
                }}
              >
                {isDisconnectingNotion ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
