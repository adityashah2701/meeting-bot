export const MEETING_REACTION_OPTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "😮", label: "Wow" },
] as const;

export type MeetingReactionEmoji = (typeof MEETING_REACTION_OPTIONS)[number]["emoji"];

export const MEETING_REACTION_EMOJI_SET = new Set<MeetingReactionEmoji>(
  MEETING_REACTION_OPTIONS.map((reaction) => reaction.emoji),
);
