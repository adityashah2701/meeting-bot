"use client";

import Link from "next/link";
import { PricingTable, useAuth, useOrganization } from "@clerk/nextjs";
import { AlertTriangle, ArrowRight, CalendarRange, CheckCircle2, CreditCard, Lock, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { LoadingBlock } from "@/components/shared/loading-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { billingService } from "@/features/billing/services/billing-service";
import { useSyncOrganizationBilling } from "@/features/billing/hooks/use-sync-organization-billing";

const featureLabels = [
  { key: "unlimitedMeetings", label: "Unlimited meetings" },
  { key: "aiSummary", label: "AI summaries" },
  { key: "notionExport", label: "Notion export" },
  { key: "recording", label: "Recordings" },
  { key: "googleCalendarSync", label: "Google Calendar sync" },
] as const;

export function BillingPage() {
  const { organization } = useOrganization();
  const { has } = useAuth();
  useSyncOrganizationBilling(organization?.id);
  const billing = useQuery(
    billingService.getOrganizationPlan,
    organization?.id ? { orgId: organization.id } : "skip",
  );

  if (billing === undefined) {
    return <LoadingBlock className="h-80 w-full" />;
  }

  const canManageBilling = Boolean(
    has?.({ permission: "org:sys_billing:manage" })
    || has?.({ permission: "org:sys_billing:read" }),
  );
  const usagePercent =
    billing.maxMeetings === null || billing.maxMeetings === 0
      ? 100
      : Math.min(100, Math.round((billing.usage.meetingsUsed / billing.maxMeetings) * 100));
  const lastSyncedLabel = billing.syncedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(billing.syncedAt))
    : "Waiting for the first billing sync";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-linear-to-br from-card via-card to-muted/30 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Workspace Billing
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Billing
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage your organization plan, track meeting capacity, and unlock premium collaboration features.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              {billing.planName}
            </Badge>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/dashboard">
                Back to dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Meeting Capacity
                </CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Track how much of your workspace meeting allowance has been used.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {billing.planName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Created meetings</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {billing.maxMeetings === null
                      ? "This workspace can create unlimited meetings."
                      : `${billing.usage.meetingsRemaining} meetings remaining before you hit the current limit.`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {billing.maxMeetings === null
                      ? `${billing.usage.meetingsUsed}+`
                      : `${billing.usage.meetingsUsed}/${billing.maxMeetings}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {billing.maxMeetings === null ? "Unlimited plan" : "meetings used"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Progress
                  value={usagePercent}
                  className="h-2 rounded-full bg-muted"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>
                    {billing.maxMeetings === null
                      ? "Unlimited"
                      : `${billing.usage.meetingsRemaining} left`}
                  </span>
                </div>
              </div>
            </div>

            {billing.usage.meetingsLimitReached ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  This workspace has reached its current meeting cap. Upgrade to restore meeting creation and unlock premium features.
                </p>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {featureLabels.map((feature) => {
                const enabled = billing.features[feature.key];
                return (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-sm"
                  >
                    <span className="text-foreground">{feature.label}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      {enabled ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Included</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Locked</span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Plan Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                Starter includes live meetings, invites, chat, and whiteboarding for quick collaboration.
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                Paid tiers unlock AI summaries, browser recordings, Notion export, and Google Calendar sync.
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                Billing is enforced at the organization level, so the whole workspace shares the same limits.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarRange className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Current Plan Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                <p className="font-medium text-foreground">{billing.planName}</p>
                <p className="mt-1">
                  {billing.maxMeetings === null
                    ? "Unlimited meetings are available in this workspace."
                    : `Up to ${billing.maxMeetings} created meetings are included on the current plan.`}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
              <div className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Billing snapshot refreshes after plan sync</span>
                </div>
                <p className="mt-1">
                  If you switch plans in Clerk, this page refreshes the entitlement snapshot when you return to the tab or focus the window.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                <p className="font-medium text-foreground">Last billing sync</p>
                <p className="mt-1">{lastSyncedLabel}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {canManageBilling ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Upgrade Workspace
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Billing changes here apply to the active organization only.
            </p>
          </CardHeader>
          <CardContent>
            <PricingTable for="organization" />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-start gap-3 px-6 py-5 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              You can view the current plan, but only billing admins can update pricing and subscriptions for this workspace.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
