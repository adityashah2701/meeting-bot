export type MeetingStatus = "scheduled" | "active" | "ended";

export type MeetingRecord = {
  _id: string;
  title: string;
  purpose: string;
  description?: string;
  status: MeetingStatus;
  scheduledFor?: number;
  startedAt?: number;
  endedAt?: number;
  activeParticipants?: number;
  summary?: string | null;
};
