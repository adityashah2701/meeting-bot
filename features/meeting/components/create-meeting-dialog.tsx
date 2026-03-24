"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useSyncOrganizationBilling } from "@/features/billing/hooks/use-sync-organization-billing";
import { billingService } from "@/features/billing/services/billing-service";
import {
  createInstantMeeting,
  meetingService,
  scheduleMeeting,
} from "@/features/meeting/services/meeting-service";
import { integrationsService } from "@/features/integrations/services/integrations-service";
import { MeetingFormInstant } from "@/features/meeting/components/meeting-form-instant";
import { MeetingFormSchedule } from "@/features/meeting/components/meeting-form-schedule";
import { getLocalDateTimeTimestamp } from "@/lib/meeting-schedule";

function parseInviteEmails(value: string) {
  return [...new Set(
    value
      .split(/[,\s\n;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export function CreateMeetingDialog({
  triggerLabel = "Start Meeting",
  triggerVariant = "default",
}: {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const { organization } = useOrganization();
  useSyncOrganizationBilling(organization?.id);
  const createMeeting = useMutation(meetingService.createMeeting);
  const billing = useQuery(
    billingService.getOrganizationPlan,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const googleCalendarConnection = useQuery(
    integrationsService.getGoogleCalendarConnection,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("instant");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteEmailsText, setInviteEmailsText] = useState("");
  const meetingLimitReached = billing?.usage.meetingsLimitReached ?? false;
  const upgradeHref = "/billing";

  const requireOrganization = () => {
    if (!organization?.id) {
      toast.error("Select an organization first.");
      return null;
    }

    return organization.id;
  };

  const connectGoogleCalendarHref = organization?.id
    ? `/api/integrations/google/start?${new URLSearchParams({
        orgId: organization.id,
        returnTo: "/integrations",
      }).toString()}`
    : undefined;

  const handleInstantSubmit = async (values: { title: string }) => {
    const orgId = requireOrganization();
    if (!orgId) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (meetingLimitReached) {
        throw new Error("This workspace has reached its meeting limit. Upgrade the plan to create more meetings.");
      }
      const meetingId = await createInstantMeeting(createMeeting, {
        orgId,
        title: values.title,
        inviteEmails: parseInviteEmails(inviteEmailsText),
      });

      setOpen(false);
      toast.success("Meeting started");
      router.push(`/meeting/${meetingId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start meeting",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (values: {
    title: string;
    description: string;
    date: string;
    time: string;
    endTime: string;
    agenda: string;
    timeZone: string;
    syncWithGoogleCalendar: boolean;
  }) => {
    const orgId = requireOrganization();
    if (!orgId) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (meetingLimitReached) {
        throw new Error("This workspace has reached its meeting limit. Upgrade the plan to create more meetings.");
      }
      const scheduledFor = getLocalDateTimeTimestamp(values.date, values.time);
      const scheduledEndsAt = getLocalDateTimeTimestamp(
        values.date,
        values.endTime,
      );

      await scheduleMeeting(createMeeting, {
        orgId,
        title: values.title,
        description: values.description,
        agenda: values.agenda,
        scheduledFor,
        scheduledEndsAt,
        scheduledTimeZone: values.timeZone,
        syncWithGoogleCalendar: values.syncWithGoogleCalendar,
        inviteEmails: parseInviteEmails(inviteEmailsText),
      });

      setOpen(false);
      toast.success(
        values.syncWithGoogleCalendar
          ? "Meeting scheduled. Google Calendar sync is running in the background."
          : "Meeting scheduled",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to schedule meeting",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Meeting</DialogTitle>
          <DialogDescription>
            Start instantly or schedule for later.
          </DialogDescription>
        </DialogHeader>

        {meetingLimitReached && billing ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Meeting limit reached</p>
                <p className="text-xs text-muted-foreground">
                  {billing.usage.meetingsUsed}/{billing.maxMeetings} meetings used in this workspace.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={upgradeHref}>Upgrade</a>
              </Button>
            </div>
          </div>
        ) : null}

        <Tabs
          className="gap-4"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instant">Instant</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="instant" className="space-y-4">
            <MeetingFormInstant
              isSubmitting={isSubmitting && activeTab === "instant"}
              onSubmit={handleInstantSubmit}
            />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <MeetingFormSchedule
              connectGoogleCalendarHref={connectGoogleCalendarHref}
              googleCalendarAccountEmail={googleCalendarConnection?.accountEmail}
              googleCalendarConnected={googleCalendarConnection?.connected === true}
              googleCalendarFeatureEnabled={billing?.features.googleCalendarSync ?? false}
              isSubmitting={isSubmitting && activeTab === "schedule"}
              onSubmit={handleScheduleSubmit}
              upgradeHref={upgradeHref}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Invite emails (optional)
          </label>
          <Input
            value={inviteEmailsText}
            onChange={(event) => setInviteEmailsText(event.target.value)}
            placeholder="alex@company.com, tanya@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Comma, space, or semicolon separated emails.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
