"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock3, Inbox, Users, XCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { invitationService } from "@/features/invitations/services/invitation-service";

function formatSchedule(timestamp: number | null) {
  if (!timestamp) {
    return "Starts when the host opens the room";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function statusTone(status: "pending" | "accepted" | "declined" | "expired") {
  if (status === "accepted") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "declined") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  if (status === "expired") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-300";
}

export function InvitationsPage() {
  const { organization } = useOrganization();
  const searchParams = useSearchParams();
  const respondToInvitation = useMutation(invitationService.respondToInvitation);
  const invitations = useQuery(
    invitationService.listMyInvitations,
    organization?.id ? { orgId: organization.id } : {},
  );

  const highlightedInviteId = searchParams.get("invite");
  const stats = useMemo(() => {
    const rows = invitations ?? [];
    return {
      pending: rows.filter((item) => item.invitationStatus === "pending").length,
      accepted: rows.filter((item) => item.invitationStatus === "accepted").length,
      live: rows.filter((item) => item.isLive && item.invitationStatus !== "declined").length,
    };
  }, [invitations]);

  const handleRespond = async (
    invitationId: Id<"meeting_invites">,
    response: "accepted" | "declined",
  ) => {
    try {
      await respondToInvitation({
        invitationId,
        response,
      });
      toast.success(
        response === "accepted"
          ? "Invitation accepted"
          : "Invitation declined",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update invitation");
    }
  };

  if (invitations === undefined) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-border bg-card p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Meeting invitations</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every meeting invite stays visible here until you act on it. Accept, decline, or jump straight into a live room.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{stats.pending} pending</Badge>
          <Badge variant="outline">{stats.accepted} accepted</Badge>
          <Badge variant="outline">{stats.live} live now</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live invites</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{stats.live}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>All invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitations.length === 0 ? (
            <EmptyState
              title="No invitations"
              description="When a teammate invites you to a meeting, it will appear here instantly."
            />
          ) : (
            invitations.map((invite) => (
              <div
                key={invite._id}
                className={`rounded-2xl border px-5 py-4 transition-colors ${
                  highlightedInviteId === invite._id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{invite.meetingTitle}</p>
                      <Badge variant="outline" className={statusTone(invite.invitationStatus)}>
                        {invite.invitationStatus}
                      </Badge>
                      {invite.isLive ? <Badge variant="secondary">Live</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{invite.meetingPurpose}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {invite.organizerName} · {invite.organizationName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatSchedule(invite.scheduledFor)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        Invited {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {invite.invitationStatus === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => void handleRespond(invite._id, "declined")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                        <Button onClick={() => void handleRespond(invite._id, "accepted")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                      </>
                    ) : null}

                    {invite.canJoin ? (
                      <Button asChild variant={invite.invitationStatus === "accepted" ? "default" : "secondary"}>
                        <Link href={invite.joinLink}>
                          {invite.invitationStatus === "accepted" ? "Join meeting" : "Join live"}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
