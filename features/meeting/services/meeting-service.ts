import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const meetingService = {
  createMeeting: api.meetings.create,
  getMeetings: api.meetings.getByOrg,
  getMeeting: api.meetings.get,
  endMeeting: api.meetings.endMeeting,
  getSummary: api.meetings.getSummary,
  saveSummary: api.meetings.saveSummary,
  listParticipants: api.participants.list,
  joinMeeting: api.participants.join,
  leaveMeeting: api.participants.leave,
  heartbeatParticipant: api.participants.heartbeat,
  updateMediaState: api.participants.updateMedia,
  listMessages: api.messages.list,
  sendMessage: api.messages.send,
  listSignals: api.signals.listForParticipant,
  sendSignal: api.signals.send,
  listTranscripts: api.transcripts.list,
  addTranscript: api.transcripts.add,
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
