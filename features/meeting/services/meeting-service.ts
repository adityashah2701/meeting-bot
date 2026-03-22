import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const meetingService = {
  createMeeting: api.meetings.index.create,
  getMeetings: api.meetings.index.getByOrg,
  getMeeting: api.meetings.index.get,
  endMeeting: api.meetings.index.endMeeting,
  getSummary: api.meetings.index.getSummary,
  saveSummary: api.meetings.index.saveSummary,
  listParticipants: api.participants.index.list,
  joinMeeting: api.participants.index.join,
  leaveMeeting: api.participants.index.leave,
  heartbeatParticipant: api.participants.index.heartbeat,
  updateMediaState: api.participants.index.updateMedia,
  listMessages: api.messages.index.list,
  sendMessage: api.messages.index.send,
  listSignals: api.signals.index.listForParticipant,
  sendSignal: api.signals.index.send,
  listTranscripts: api.transcripts.index.list,
  addTranscript: api.transcripts.index.add,
};

type CreateMeetingMutation = (args: {
  orgId: string;
  title: string;
  purpose?: string;
  description?: string;
  scheduledFor?: number;
}) => Promise<Id<"meetings">>;

export function getInstantMeetingTitle(now = new Date()) {
  return `Quick Meeting - ${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export async function createInstantMeeting(
  createMeeting: CreateMeetingMutation,
  args: {
    orgId: string;
    title?: string;
  },
) {
  const title = args.title?.trim() || getInstantMeetingTitle();

  return await createMeeting({
    orgId: args.orgId,
    title,
    purpose: title,
  });
}

export async function scheduleMeeting(
  createMeeting: CreateMeetingMutation,
  args: {
    orgId: string;
    title: string;
    description?: string;
    agenda?: string;
    scheduledFor: number;
  },
) {
  const title = args.title.trim();
  const description = args.description?.trim();
  const agenda = args.agenda?.trim();

  return await createMeeting({
    orgId: args.orgId,
    title,
    description,
    purpose: agenda || description || title,
    scheduledFor: args.scheduledFor,
  });
}

export async function summarizeTranscript(transcript: Array<{ sender: string; text: string }>) {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to generate summary");
  }

  return payload.summary as string;
}
