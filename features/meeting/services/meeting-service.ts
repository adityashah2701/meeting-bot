import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const meetingService = {
  createMeeting: api.meetings.index.create,
  getMeetings: api.meetings.index.getByOrg,
  getMinutesByOrg: api.meetings.index.getMinutesByOrg,
  getMeeting: api.meetings.index.get,
  endMeeting: api.meetings.index.endMeeting,
  updateMeetingSettings: api.meetings.index.updateSettings,
  updateMeetingLock: api.meetings.index.updateLock,
  inviteParticipants: api.meetings.index.inviteParticipants,
  listInvites: api.meetings.index.listInvites,
  resendInvite: api.meetings.index.resendInvite,
  cancelInvite: api.meetings.index.cancelInvite,
  getSummary: api.meetings.index.getSummary,
  saveSummary: api.meetings.index.saveSummary,
  getWhiteboard: api.meetings.index.getWhiteboard,
  setWhiteboardOpen: api.meetings.index.setWhiteboardOpen,
  saveWhiteboardScene: api.meetings.index.saveWhiteboardScene,
  startRecording: api.recordings.index.start,
  stopRecording: api.recordings.index.stop,
  generateRecordingUploadUrl: api.recordings.index.generateUploadUrl,
  markRecordingReady: api.recordings.index.markReady,
  markRecordingFailed: api.recordings.index.markFailed,
  listRecordings: api.recordings.index.listByMeeting,
  getNotionConnection: api.integrations.index.getNotionConnection,
  getMeetingNotionExport: api.integrations.index.getMeetingNotionExport,
  exportMeetingToNotion: api.integrations.index.exportMeetingToNotion,
  saveChunk: api.meetings.summaryChunks.saveChunk,
  listChunks: api.meetings.summaryChunks.listChunks,
  listReactions: api.reactions.index.listByMeeting,
  sendReaction: api.reactions.index.send,
  listParticipants: api.participants.index.list,
  listWaitingRoom: api.participants.index.listWaitingRoom,
  joinMeeting: api.participants.index.join,
  leaveMeeting: api.participants.index.leave,
  heartbeatParticipant: api.participants.index.heartbeat,
  updateMediaState: api.participants.index.updateMedia,
  admitParticipant: api.participants.index.admit,
  bulkAdmitParticipants: api.participants.index.bulkAdmit,
  rejectParticipant: api.participants.index.reject,
  updateParticipantRole: api.participants.index.updateRole,
  setParticipantAudio: api.participants.index.setParticipantAudio,
  removeParticipant: api.participants.index.removeParticipant,
  restoreParticipant: api.participants.index.restoreParticipant,
  listMessages: api.messages.index.list,
  sendMessage: api.messages.index.send,
  listSignals: api.signals.index.listForParticipant,
  sendSignal: api.signals.index.send,
  clearSignals: api.signals.index.clear,
  listTranscripts: api.transcripts.index.list,
  addTranscript: api.transcripts.index.add,
  addTranscriptBatch: api.transcripts.index.addBatch,
  createTasksFromSummary: api.tasks.index.createFromSummary,
};

type CreateMeetingMutation = (args: {
  orgId: string;
  title: string;
  purpose?: string;
  description?: string;
  scheduledFor?: number;
  scheduledEndsAt?: number;
  scheduledTimeZone?: string;
  syncWithGoogleCalendar?: boolean;
  settings?: {
    joinMode: "organization_only" | "invite_only" | "anyone_with_link" | "ask_to_join";
    allowScreenShare: boolean;
    allowWhiteboard?: boolean;
    allowChat: boolean;
    allowReactions: boolean;
    allowRecording: boolean;
    allowParticipantsToUnmute: boolean;
    autoAdmitOrgUsers: boolean;
    lobbyEnabled: boolean;
  };
  inviteEmails?: string[];
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
    inviteEmails?: string[];
  },
) {
  const title = args.title?.trim() || getInstantMeetingTitle();

  return await createMeeting({
    orgId: args.orgId,
    title,
    purpose: title,
    inviteEmails: args.inviteEmails,
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
    scheduledEndsAt: number;
    scheduledTimeZone?: string;
    syncWithGoogleCalendar?: boolean;
    inviteEmails?: string[];
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
    scheduledEndsAt: args.scheduledEndsAt,
    scheduledTimeZone: args.scheduledTimeZone,
    syncWithGoogleCalendar: args.syncWithGoogleCalendar,
    inviteEmails: args.inviteEmails,
  });
}

export type ActionItem = {
  task: string;
  assignee: string | null;
  due: string | null;
};

export type MeetingSummaryResult = {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  /** Flat list of task titles for backwards-compatible createTasksFromSummary */
  actionItems: string[];
};

export async function summarizeTranscript(
  transcript: Array<{ sender: string; text: string }>,
) {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to generate summary");
  }

  return payload as MeetingSummaryResult;
}
