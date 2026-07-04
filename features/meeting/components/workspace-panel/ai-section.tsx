"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSyncOrganizationBilling } from "@/features/billing/hooks/use-sync-organization-billing";
import { billingService } from "@/features/billing/services/billing-service";
import {
  meetingService,
  summarizeTranscript,
  type MeetingSummaryResult,
} from "@/features/meeting/services/meeting-service";
import type { TranscriptLine } from "@/features/ai/hooks/use-transcription";

function withoutNodeProp<T extends { node?: unknown }>(props: T) {
  const { node, ...rest } = props;
  void node;
  return rest;
}

export function AiSection({
  meetingId,
  orgId,
  transcript,
}: {
  meetingId: Id<"meetings">;
  orgId: string;
  transcript: TranscriptLine[];
}) {
  useSyncOrganizationBilling(orgId);
  const billing = useQuery(billingService.getOrganizationPlan, orgId ? { orgId } : "skip");
  const summaryAsset = useQuery(meetingService.getSummary, { meetingId });
  const saveSummary = useMutation(meetingService.saveSummary);
  const createTasksFromSummary = useMutation(meetingService.createTasksFromSummary);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [structuredResult, setStructuredResult] = useState<MeetingSummaryResult | null>(null);

  const handleGenerateSummary = async () => {
    const transcriptPayload = transcript
      .filter((line) => !line.isInterim)
      .map((line) => ({ sender: line.sender, text: line.text }));

    if (transcriptPayload.length === 0) {
      toast.error("Wait for transcript data before generating a summary");
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeTranscript(transcriptPayload);
      setStructuredResult(result);
      await saveSummary({
        meetingId,
        summary: result.summary,
        key_points: result.key_points,
        decisions: result.decisions,
        action_items: result.action_items,
      });

      if (result.action_items.length > 0) {
        await createTasksFromSummary({
          orgId,
          meetingId,
          actionItems: result.action_items.map((item) => ({
            title: item.task,
            assigneeName: item.assignee,
          })),
        });
        toast.success(`Summary saved · ${result.action_items.length} task(s) created`);
      } else {
        toast.success("Summary saved");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to summarize meeting");
    } finally {
      setIsSummarizing(false);
    }
  };

  const displaySummary = structuredResult?.summary ?? summaryAsset?.content ?? null;
  const keyPoints = structuredResult?.key_points ?? [];
  const decisions = structuredResult?.decisions ?? [];
  const actionItems = structuredResult?.action_items ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <Button
        onClick={() => void handleGenerateSummary()}
        disabled={isSummarizing || billing?.features.aiSummary === false}
        className="w-full gap-2"
        variant={displaySummary ? "outline" : "default"}
      >
        {isSummarizing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            AI is generating summary...
          </>
        ) : displaySummary ? (
          <>
            <RefreshCw className="h-4 w-4" />
            Regenerate summary
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate summary
          </>
        )}
      </Button>

      {billing?.features.aiSummary === false ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          AI summaries are available on paid workspace plans.
        </p>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        {!displaySummary && !isSummarizing ? (
          <EmptyState
            title="No summary yet"
            description="Generate a summary to see key points, decisions, and action items."
          />
        ) : isSummarizing ? (
          <div className="flex flex-col items-center gap-3 pt-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Analyzing transcript...</p>
          </div>
        ) : (
          <div className="space-y-5 pr-2 text-sm">
            {displaySummary ? (
              <div>
                <ReactMarkdown
                  components={{
                    h1: (props) => (
                      <h1 className="mb-3 text-lg font-semibold text-foreground" {...withoutNodeProp(props)} />
                    ),
                    h2: (props) => (
                      <h2 className="mb-2 mt-4 text-sm font-semibold text-foreground" {...withoutNodeProp(props)} />
                    ),
                    h3: (props) => (
                      <h3 className="mb-1.5 mt-3 text-sm font-semibold text-foreground" {...withoutNodeProp(props)} />
                    ),
                    p: (props) => (
                      <p
                        className="mb-2 whitespace-pre-wrap leading-relaxed text-foreground last:mb-0"
                        {...withoutNodeProp(props)}
                      />
                    ),
                    ul: (props) => (
                      <ul className="mb-2 list-disc space-y-1.5 pl-5 text-foreground" {...withoutNodeProp(props)} />
                    ),
                    ol: (props) => (
                      <ol className="mb-2 list-decimal space-y-1.5 pl-5 text-foreground" {...withoutNodeProp(props)} />
                    ),
                    li: (props) => <li className="leading-relaxed" {...withoutNodeProp(props)} />,
                    strong: (props) => (
                      <strong className="font-semibold text-foreground" {...withoutNodeProp(props)} />
                    ),
                  }}
                >
                  {displaySummary}
                </ReactMarkdown>
              </div>
            ) : null}

            {keyPoints.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Points
                </p>
                <ul className="space-y-1.5">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex gap-2 text-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {decisions.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Decisions
                </p>
                <ul className="space-y-1.5">
                  {decisions.map((decision, index) => (
                    <li key={index} className="flex gap-2 text-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {actionItems.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Action Items
                </p>
                <div className="space-y-4">
                  {actionItems.map((item, index) => (
                    <div key={index} className="rounded-md border border-border bg-background px-3 py-2">
                      <p className="font-medium text-foreground">{item.task}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {item.assignee ? (
                          <Badge variant="secondary" className="text-xs">
                            {item.assignee}
                          </Badge>
                        ) : null}
                        {item.due ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {item.due}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
