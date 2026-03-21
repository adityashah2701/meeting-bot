"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { insightService } from "@/features/ai/services/insight-service";

export function InsightsPage() {
  const { organization } = useOrganization();
  const insights = useQuery(
    insightService.getInsights,
    organization?.id ? { orgId: organization.id } : "skip",
  );

  if (insights === undefined) {
    return <LoadingBlock className="h-72 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-card p-6">
        <h1 className="text-3xl font-semibold text-foreground">Insights</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live metrics from meetings already stored in Convex.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader><CardTitle>Total meetings</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totals.meetings}</CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader><CardTitle>Active</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totals.active}</CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader><CardTitle>Ended</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totals.ended}</CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Meeting timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.timeline.length === 0 ? (
            <EmptyState title="No insight data yet" description="Run meetings to populate analytics." />
          ) : (
            insights.timeline.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/meeting/${meeting.id}/details`}
                className="flex items-center justify-between border border-border px-4 py-3 text-sm hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{meeting.title}</span>
                <span className="uppercase text-muted-foreground">{meeting.status}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
