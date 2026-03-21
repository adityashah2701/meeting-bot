export type DashboardOverview = {
  stats: {
    totalMeetings: number;
    activeMeetings: number;
    scheduledMeetings: number;
    summariesGenerated: number;
    openTasks: number;
  };
  recentMeetings: Array<{
    _id: string;
    title: string;
    status: "scheduled" | "active" | "ended";
    purpose: string;
    _creationTime: number;
    scheduledFor?: number;
  }>;
  activeMeeting: {
    _id: string;
    title: string;
  } | null;
};
