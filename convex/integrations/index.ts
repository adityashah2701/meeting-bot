import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { assertMeetingAccess, assertOrgAccess, requireIdentity } from "../lib/auth";
import { normalizeInviteEmail, resolveInviteStatus } from "../lib/invitations";
import {
  formatCalendarDateTimeInTimeZone,
  resolveScheduledEndsAt,
} from "../../lib/meeting-schedule";
import {
  buildPublicAppUrl,
  getPublicAppUrl,
} from "../../lib/public-app-url";

const GOOGLE_PROVIDER = "google_calendar" as const;
const NOTION_PROVIDER = "notion" as const;
const GOOGLE_SYNC_STATUS_VALIDATOR = v.union(
  v.literal("pending"),
  v.literal("synced"),
  v.literal("failed"),
);
const GOOGLE_CONNECTION_STATUS_VALIDATOR = v.union(
  v.literal("connected"),
  v.literal("error"),
  v.literal("revoked"),
);
const NOTION_CONNECTION_STATUS_VALIDATOR = v.union(
  v.literal("connected"),
  v.literal("error"),
  v.literal("revoked"),
);
const MEETING_EXPORT_STATUS_VALIDATOR = v.union(
  v.literal("pending"),
  v.literal("exported"),
  v.literal("failed"),
);
const NOTION_VERSION = "2026-03-11";
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_PAGE_TEXT_LIMIT = 1800;
const NOTION_BLOCK_BATCH_SIZE = 100;

type GoogleConnection = Doc<"user_integrations">;
type NotionConnection = Doc<"notion_integrations">;
type NotionExportConnection = NotionConnection & { targetPageId: string };
type GoogleCalendarSyncContext = {
  meeting: Doc<"meetings">;
  connection: GoogleConnection | null;
  attendeeEmails: string[];
};
type NotionRichText = {
  type: "text";
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    color?:
      | "default"
      | "gray"
      | "brown"
      | "orange"
      | "yellow"
      | "green"
      | "blue"
      | "purple"
      | "pink"
      | "red";
  };
};
type NotionBlock = {
  object: "block";
  type:
    | "heading_2"
    | "heading_3"
    | "paragraph"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "to_do"
    | "divider";
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
  paragraph?: { rich_text: NotionRichText[] };
  bulleted_list_item?: { rich_text: NotionRichText[] };
  numbered_list_item?: { rich_text: NotionRichText[] };
  to_do?: { rich_text: NotionRichText[]; checked: boolean };
  divider?: Record<string, never>;
};
type NotionPageCreateResponse = {
  id: string;
  url?: string;
};

function formatLogTimestamp(timestamp?: number | null) {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function isGoogleCalendarAuthError(message?: string) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid_grant") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("login required") ||
    normalized.includes("refresh token") ||
    normalized.includes("unauthorized") ||
    normalized.includes("access token")
  );
}

function isUsableGoogleCalendarConnection(connection: GoogleConnection | null) {
  if (!connection || connection.status === "revoked") {
    return false;
  }

  if (connection.status === "connected") {
    return true;
  }

  return !isGoogleCalendarAuthError(connection.lastError);
}

function getMeetingJoinUrl(meetingId: Id<"meetings">) {
  return buildPublicAppUrl(`/meeting/${meetingId}`);
}

function buildGoogleEventDescription(
  meeting: Pick<
    Doc<"meetings">,
    "title" | "purpose" | "description"
  > & { _id: Id<"meetings"> },
) {
  const joinUrl = getMeetingJoinUrl(meeting._id);
  const sections = [
    joinUrl ? `Join meeting: ${joinUrl}` : null,
    `Meeting: ${meeting.title}`,
    meeting.purpose ? `Purpose: ${meeting.purpose}` : null,
    meeting.description ? `Notes: ${meeting.description}` : null,
  ].filter((value): value is string => Boolean(value));

  return sections.join("\n\n");
}

function isNotionAuthError(message?: string, status?: number) {
  if (status === 401) {
    return true;
  }

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("unauthorized") ||
    normalized.includes("access token") ||
    normalized.includes("refresh token") ||
    normalized.includes("invalid_grant")
  );
}

function normalizeNotionPageId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const decoded = decodeURIComponent(trimmed);
  const match = decoded.match(
    /([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
  );

  if (!match) {
    throw new Error("Enter a valid Notion page URL or page ID");
  }

  const compact = match[1].replace(/-/g, "").toLowerCase();
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function chunkText(value: string, maxLength = NOTION_PAGE_TEXT_LIMIT) {
  const text = value.trim();
  if (!text) {
    return [];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength);
    const splitIndex = Math.max(
      candidate.lastIndexOf("\n"),
      candidate.lastIndexOf(" "),
    );
    const boundary = splitIndex > maxLength * 0.5 ? splitIndex : maxLength;
    chunks.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function createRichTextFragment(
  content: string,
  options?: {
    link?: string;
    annotations?: NotionRichText["annotations"];
  },
): NotionRichText | null {
  if (!content.trim()) {
    return null;
  }

  return {
    type: "text",
    text: {
      content,
      ...(options?.link ? { link: { url: options.link } } : {}),
    },
    ...(options?.annotations ? { annotations: options.annotations } : {}),
  };
}

function createRichText(
  content: string,
  link?: string,
  annotations?: NotionRichText["annotations"],
): NotionRichText[] {
  const fragment = createRichTextFragment(content, { link, annotations });
  return fragment ? [fragment] : [];
}

function createMarkdownRichText(content: string): NotionRichText[] {
  const text = content.trim();
  if (!text) {
    return [];
  }

  const tokenRegex =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const richText: NotionRichText[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const [token, , linkLabel, linkUrl, boldText, codeText, italicText] = match;
    const tokenIndex = match.index ?? 0;

    if (tokenIndex > lastIndex) {
      richText.push(...createRichText(text.slice(lastIndex, tokenIndex)));
    }

    if (linkLabel && linkUrl) {
      richText.push(...createRichText(linkLabel, linkUrl));
    } else if (boldText) {
      richText.push(...createRichText(boldText, undefined, { bold: true }));
    } else if (codeText) {
      richText.push(...createRichText(codeText, undefined, { code: true }));
    } else if (italicText) {
      richText.push(...createRichText(italicText, undefined, { italic: true }));
    } else {
      richText.push(...createRichText(token));
    }

    lastIndex = tokenIndex + token.length;
  }

  if (lastIndex < text.length) {
    richText.push(...createRichText(text.slice(lastIndex)));
  }

  return richText.length > 0 ? richText : createRichText(text);
}

function createBlockFromRichText(
  type:
    | "paragraph"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "to_do",
  richText: NotionRichText[],
  options?: {
    checked?: boolean;
  },
) {
  if (richText.length === 0) {
    return null;
  }

  if (type === "paragraph") {
    return {
      object: "block" as const,
      type,
      paragraph: { rich_text: richText },
    };
  }

  if (type === "bulleted_list_item") {
    return {
      object: "block" as const,
      type,
      bulleted_list_item: { rich_text: richText },
    };
  }

  if (type === "numbered_list_item") {
    return {
      object: "block" as const,
      type,
      numbered_list_item: { rich_text: richText },
    };
  }

  return {
    object: "block" as const,
    type,
    to_do: {
      rich_text: richText,
      checked: options?.checked ?? false,
    },
  };
}

function createTextBlocks(
  type: "paragraph" | "bulleted_list_item" | "numbered_list_item" | "to_do",
  value: string,
  options?: {
    link?: string;
    checked?: boolean;
    markdown?: boolean;
  },
) {
  return chunkText(value).map<NotionBlock>((chunk) => {
    const richText = options?.markdown
      ? createMarkdownRichText(chunk)
      : createRichText(chunk, options?.link);
    return createBlockFromRichText(type, richText, {
      checked: options?.checked,
    })!;
  });
}

function createHeadingBlock(
  level: "heading_2" | "heading_3",
  value: string,
): NotionBlock {
  const richText = createRichText(value.slice(0, NOTION_PAGE_TEXT_LIMIT));
  if (level === "heading_2") {
    return {
      object: "block",
      type: level,
      heading_2: { rich_text: richText },
    };
  }

  return {
    object: "block",
    type: level,
    heading_3: { rich_text: richText },
  };
}

function createDividerBlock(): NotionBlock {
  return {
    object: "block",
    type: "divider",
    divider: {},
  };
}

function createLabeledListItem(
  label: string,
  value: string,
  options?: {
    link?: string;
  },
) {
  const richText = [
    ...createRichText(`${label}: `, undefined, { bold: true }),
    ...(options?.link ? createRichText(value, options.link) : createMarkdownRichText(value)),
  ];
  const block = createBlockFromRichText("bulleted_list_item", richText);
  return block ? [block] : [];
}

function parseMarkdownToBlocks(markdown: string) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  const blocks: NotionBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const paragraph = paragraphLines.join(" ").trim();
    paragraphLines = [];
    if (!paragraph) {
      return;
    }
    blocks.push(...createTextBlocks("paragraph", paragraph, { markdown: true }));
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const todoMatch = trimmed.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (todoMatch) {
      flushParagraph();
      blocks.push(
        ...createTextBlocks("to_do", todoMatch[2], {
          checked: todoMatch[1].toLowerCase() === "x",
          markdown: true,
        }),
      );
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push(createHeadingBlock("heading_3", headingMatch[1]));
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      blocks.push(
        ...createTextBlocks("numbered_list_item", numberedMatch[1], {
          markdown: true,
        }),
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push(
        ...createTextBlocks("bulleted_list_item", bulletMatch[1], {
          markdown: true,
        }),
      );
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function createSectionBlocks(
  title: string,
  body: NotionBlock[],
) {
  if (body.length === 0) {
    return [];
  }

  return [createHeadingBlock("heading_2", title), ...body];
}

function formatMeetingTimestamp(
  timestamp?: number,
  timeZone?: string,
) {
  if (typeof timestamp !== "number") {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(timestamp);
}

function buildNotionMeetingBlocks(args: {
  meeting: {
    _id: Id<"meetings">;
    title: string;
    purpose: string;
    description?: string;
    status: "scheduled" | "active" | "ended";
    orgId: string;
    scheduledFor?: number;
    scheduledEndsAt?: number;
    scheduledTimeZone?: string;
    summary: string | null;
    key_points: string[];
    decisions: string[];
    action_items: Array<{ task: string; assignee?: string | null; due?: string | null }>;
  };
  transcripts: Array<{ speakerName: string; text: string; timestamp: number }>;
  recordings: Array<{ playbackUrl?: string | null; startedAt: number; status: string }>;
}) {
  const joinUrl = getMeetingJoinUrl(args.meeting._id);
  const detailUrl = buildPublicAppUrl(`/meeting/${args.meeting._id}/details`);
  const blocks: NotionBlock[] = [];
  const statusLabel =
    args.meeting.status.charAt(0).toUpperCase() + args.meeting.status.slice(1);

  const scheduledLabel = formatMeetingTimestamp(
    args.meeting.scheduledFor,
    args.meeting.scheduledTimeZone,
  );
  const snapshotBlocks: NotionBlock[] = [
    ...createLabeledListItem("Status", statusLabel),
  ];
  if (scheduledLabel) {
    snapshotBlocks.push(...createLabeledListItem("Scheduled for", scheduledLabel));
  }
  if (args.meeting.purpose) {
    snapshotBlocks.push(...createLabeledListItem("Purpose", args.meeting.purpose));
  }
  if (args.meeting.description) {
    snapshotBlocks.push(...createLabeledListItem("Notes", args.meeting.description));
  }

  blocks.push(...createSectionBlocks("Meeting Snapshot", snapshotBlocks));

  const linkBlocks: NotionBlock[] = [];
  if (joinUrl) {
    linkBlocks.push(...createLabeledListItem("Join meeting", "Open live room", { link: joinUrl }));
  }
  if (detailUrl) {
    linkBlocks.push(
      ...createLabeledListItem("Meeting details", "Open in Meeting Bot", {
        link: detailUrl,
      }),
    );
  }
  blocks.push(...createSectionBlocks("Links", linkBlocks));
  if (blocks.length > 0) {
    blocks.push(createDividerBlock());
  }

  blocks.push(
    ...createSectionBlocks(
      "Summary",
      args.meeting.summary
        ? parseMarkdownToBlocks(args.meeting.summary)
        : createTextBlocks("paragraph", "Summary not generated yet."),
    ),
  );

  blocks.push(
    ...createSectionBlocks(
      "Key Points",
      args.meeting.key_points.flatMap((point) => createTextBlocks("bulleted_list_item", point)),
    ),
  );

  blocks.push(
    ...createSectionBlocks(
      "Decisions",
      args.meeting.decisions.flatMap((decision) =>
        createTextBlocks("bulleted_list_item", decision)
      ),
    ),
  );

  blocks.push(
    ...createSectionBlocks(
      "Action Items",
      args.meeting.action_items.flatMap((item) => {
        const richText = [
          ...createMarkdownRichText(item.task),
          ...(item.assignee
            ? [
                ...createRichText(" | ", undefined),
                ...createRichText("Assignee: ", undefined, { bold: true }),
                ...createRichText(item.assignee),
              ]
            : []),
          ...(item.due
            ? [
                ...createRichText(" | ", undefined),
                ...createRichText("Due: ", undefined, { bold: true }),
                ...createRichText(item.due),
              ]
            : []),
        ];
        const block = createBlockFromRichText("to_do", richText);
        return block ? [block] : [];
      }),
    ),
  );

  const recordingBlocks = args.recordings.flatMap((recording, index) => {
    const startedLabel = formatMeetingTimestamp(recording.startedAt);
    const label = startedLabel
      ? `Recording ${index + 1} (${startedLabel})`
      : `Recording ${index + 1}`;
    if (!recording.playbackUrl) {
      return createTextBlocks("bulleted_list_item", `${label} - ${recording.status}`);
    }
    return createTextBlocks("bulleted_list_item", label, {
      link: recording.playbackUrl,
    });
  });

  blocks.push(...createSectionBlocks("Recordings", recordingBlocks));

  const transcriptBlocks = args.transcripts.flatMap((line) => {
    const richText = [
      ...createRichText(line.speakerName || "Unknown speaker", undefined, {
        bold: true,
      }),
      ...createRichText(
        ` (${formatMeetingTimestamp(line.timestamp) ?? "Unknown time"})`,
        undefined,
        { italic: true, color: "gray" },
      ),
      ...createRichText(": "),
      ...createMarkdownRichText(line.text),
    ];
    const block = createBlockFromRichText("paragraph", richText);
    return block ? [block] : [];
  });
  blocks.push(...createSectionBlocks("Transcript", transcriptBlocks));

  return blocks;
}

function buildNotionMeetingPageTitle(meeting: {
  title: string;
  scheduledFor?: number;
  scheduledTimeZone?: string;
}) {
  const scheduledLabel = formatMeetingTimestamp(
    meeting.scheduledFor,
    meeting.scheduledTimeZone,
  );
  const parts = [meeting.title.trim() || "Meeting"];
  if (scheduledLabel) {
    parts.push(scheduledLabel);
  }
  return parts.join(" | ").slice(0, NOTION_PAGE_TEXT_LIMIT);
}

type NotionApiRequestOptions = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  accessToken: string;
  body?: Record<string, unknown>;
};

async function notionApiRequest<T>({
  method,
  path,
  accessToken,
  body,
}: NotionApiRequestOptions): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string; code?: string })
    | { message?: string; code?: string }
    | null;

  if (!response.ok) {
    const error = new Error(
      payload && "message" in payload && payload.message
        ? payload.message
        : "Notion request failed",
    ) as Error & {
      status?: number;
      code?: string;
    };
    error.status = response.status;
    error.code = payload && "code" in payload ? payload.code : undefined;
    throw error;
  }

  return payload as T;
}

async function exchangeNotionRefreshToken(connection: NotionConnection) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Notion environment variables are not configured");
  }

  if (!connection.refreshToken) {
    throw new Error("Notion refresh token is missing");
  }

  const response = await fetch(`${NOTION_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }),
  });

  const payload = (await response.json()) as
    | {
        access_token?: string;
        refresh_token?: string;
        bot_id?: string;
        workspace_name?: string | null;
        workspace_icon?: string | null;
        workspace_id?: string | null;
        duplicated_template_id?: string | null;
        token_type?: string;
      }
    | {
        error?: string;
        error_description?: string;
      };

  if (!response.ok || !("access_token" in payload) || !payload.access_token) {
    throw new Error(
      "error_description" in payload && payload.error_description
        ? payload.error_description
        : "Unable to refresh Notion access token",
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? connection.refreshToken,
    botId: payload.bot_id ?? connection.botId,
    workspaceName: payload.workspace_name ?? connection.workspaceName,
    workspaceIcon: payload.workspace_icon ?? connection.workspaceIcon,
    workspaceId: payload.workspace_id ?? connection.workspaceId,
    duplicatedTemplateId:
      payload.duplicated_template_id ?? connection.duplicatedTemplateId,
    tokenType: payload.token_type ?? connection.tokenType,
  };
}

async function exchangeGoogleRefreshToken(connection: GoogleConnection) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar environment variables are not configured");
  }

  if (!connection.refreshToken) {
    throw new Error("Google Calendar refresh token is missing");
  }

  console.info("[google-calendar] Refreshing access token", {
    connectionId: connection._id,
    accountEmail: connection.accountEmail,
    tokenExpiresAt: formatLogTimestamp(connection.tokenExpiresAt),
    hasGoogleClientId: Boolean(clientId),
    hasGoogleClientSecret: Boolean(clientSecret),
    hasRefreshToken: Boolean(connection.refreshToken),
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = (await response.json()) as
    | {
        access_token?: string;
        expires_in?: number;
        refresh_token?: string;
      }
    | {
        error?: string;
        error_description?: string;
      };

  if (!response.ok || !("access_token" in payload) || !payload.access_token) {
    console.error("[google-calendar] Access token refresh failed", {
      connectionId: connection._id,
      accountEmail: connection.accountEmail,
      status: response.status,
      error:
        "error_description" in payload && payload.error_description
          ? payload.error_description
          : "Unable to refresh Google Calendar token",
    });
    throw new Error(
      "error_description" in payload && payload.error_description
        ? payload.error_description
        : "Unable to refresh Google Calendar token",
    );
  }

  console.info("[google-calendar] Access token refresh succeeded", {
    connectionId: connection._id,
    accountEmail: connection.accountEmail,
    tokenExpiresAt: formatLogTimestamp(
      Date.now() + Math.max(payload.expires_in ?? 3600, 60) * 1000,
    ),
    receivedRefreshToken: Boolean(payload.refresh_token),
  });

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? connection.refreshToken,
    tokenExpiresAt: Date.now() + Math.max(payload.expires_in ?? 3600, 60) * 1000,
  };
}

export const getGoogleCalendarConnection = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const connection = await ctx.db
      .query("user_integrations")
      .withIndex("by_userTokenIdentifier_and_provider", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("provider", GOOGLE_PROVIDER),
      )
      .unique();

    if (!connection || connection.status === "revoked") {
      return {
        connected: false,
        provider: GOOGLE_PROVIDER,
        hasRefreshToken: false,
        hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
        hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
        hasConfiguredCalendarId: Boolean(process.env.GOOGLE_CALENDAR_ID),
        publicAppUrlConfigured: Boolean(getPublicAppUrl()),
        publicAppUrl: getPublicAppUrl() ?? undefined,
      } as const;
    }

    const hasAuthError = !isUsableGoogleCalendarConnection(connection);
    const warning =
      connection.lastError && !hasAuthError ? connection.lastError : undefined;
    const publicAppUrl = getPublicAppUrl();

    return {
      connected: !hasAuthError,
      provider: GOOGLE_PROVIDER,
      accountEmail: connection.accountEmail,
      status: hasAuthError ? "error" : "connected",
      scope: connection.scope,
      tokenExpiresAt: connection.tokenExpiresAt,
      connectedAt: connection.connectedAt,
      updatedAt: connection.updatedAt,
      lastError: hasAuthError ? connection.lastError : undefined,
      warning,
      hasRefreshToken: Boolean(connection.refreshToken),
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      hasConfiguredCalendarId: Boolean(process.env.GOOGLE_CALENDAR_ID),
      publicAppUrlConfigured: Boolean(publicAppUrl),
      publicAppUrl: publicAppUrl ?? undefined,
    } as const;
  },
});

export const connectGoogleCalendar = mutation({
  args: {
    orgId: v.string(),
    accountEmail: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    scope: v.array(v.string()),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const existing = await ctx.db
      .query("user_integrations")
      .withIndex("by_userTokenIdentifier_and_provider", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("provider", GOOGLE_PROVIDER),
      )
      .unique();

    const now = Date.now();
    const payload = {
      userTokenIdentifier: identity.tokenIdentifier,
      provider: GOOGLE_PROVIDER,
      accountEmail: normalizeInviteEmail(args.accountEmail),
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? existing?.refreshToken,
      scope: args.scope,
      tokenExpiresAt: args.tokenExpiresAt,
      status: "connected" as const,
      lastError: undefined,
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("user_integrations", payload);
  },
});

export const disconnectGoogleCalendar = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const existing = await ctx.db
      .query("user_integrations")
      .withIndex("by_userTokenIdentifier_and_provider", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("provider", GOOGLE_PROVIDER),
      )
      .unique();

    if (!existing) {
      return { disconnected: false } as const;
    }

    await ctx.db.delete(existing._id);
    return { disconnected: true } as const;
  },
});

export const getNotionConnection = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const connection = await ctx.db
      .query("notion_integrations")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .unique();

    if (!connection || connection.status === "revoked") {
      return {
        connected: false,
        provider: NOTION_PROVIDER,
        hasNotionClientId: Boolean(process.env.NOTION_CLIENT_ID),
        hasNotionClientSecret: Boolean(process.env.NOTION_CLIENT_SECRET),
        publicAppUrlConfigured: Boolean(getPublicAppUrl()),
        publicAppUrl: getPublicAppUrl() ?? undefined,
      } as const;
    }

    const hasAuthError = connection.status === "error" && isNotionAuthError(connection.lastError);
    const warning =
      connection.lastError && !hasAuthError ? connection.lastError : undefined;

    return {
      connected: connection.status === "connected" && !hasAuthError,
      provider: NOTION_PROVIDER,
      workspaceId: connection.workspaceId,
      workspaceName: connection.workspaceName,
      workspaceIcon: connection.workspaceIcon,
      botId: connection.botId,
      targetPageId: connection.targetPageId,
      status: connection.status,
      connectedAt: connection.connectedAt,
      updatedAt: connection.updatedAt,
      lastError: hasAuthError ? connection.lastError : undefined,
      warning,
      hasRefreshToken: Boolean(connection.refreshToken),
      hasNotionClientId: Boolean(process.env.NOTION_CLIENT_ID),
      hasNotionClientSecret: Boolean(process.env.NOTION_CLIENT_SECRET),
      publicAppUrlConfigured: Boolean(getPublicAppUrl()),
      publicAppUrl: getPublicAppUrl() ?? undefined,
    } as const;
  },
});

export const connectNotion = mutation({
  args: {
    orgId: v.string(),
    workspaceId: v.optional(v.string()),
    workspaceName: v.optional(v.string()),
    workspaceIcon: v.optional(v.string()),
    botId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    duplicatedTemplateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const existing = await ctx.db
      .query("notion_integrations")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .unique();

    const now = Date.now();
    const payload = {
      userTokenIdentifier: identity.tokenIdentifier,
      orgId: args.orgId,
      workspaceId: args.workspaceId,
      workspaceName: args.workspaceName,
      workspaceIcon: args.workspaceIcon,
      botId: args.botId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? existing?.refreshToken,
      tokenType: args.tokenType,
      duplicatedTemplateId: args.duplicatedTemplateId,
      targetPageId: existing?.targetPageId,
      status: "connected" as const,
      lastError: undefined,
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("notion_integrations", payload);
  },
});

export const disconnectNotion = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const existing = await ctx.db
      .query("notion_integrations")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .unique();

    if (!existing) {
      return { disconnected: false } as const;
    }

    await ctx.db.delete(existing._id);
    return { disconnected: true } as const;
  },
});

export const updateNotionTargetPage = mutation({
  args: {
    orgId: v.string(),
    targetPageId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertOrgAccess(ctx, identity.tokenIdentifier, args.orgId);

    const connection = await ctx.db
      .query("notion_integrations")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .unique();

    if (!connection) {
      throw new Error("Connect Notion before saving an export destination");
    }

    const normalizedTargetPageId = args.targetPageId
      ? normalizeNotionPageId(args.targetPageId) ?? undefined
      : undefined;

    await ctx.db.patch(connection._id, {
      targetPageId: normalizedTargetPageId,
      updatedAt: Date.now(),
      lastError: undefined,
      status: "connected",
    });

    return {
      targetPageId: normalizedTargetPageId ?? null,
    } as const;
  },
});

export const getMeetingNotionExport = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertMeetingAccess(ctx, identity.tokenIdentifier, args.meetingId);

    return await ctx.db
      .query("meeting_exports")
      .withIndex("by_meetingId_and_provider", (q) =>
        q.eq("meetingId", args.meetingId).eq("provider", NOTION_PROVIDER),
      )
      .unique();
  },
});

export const getNotionConnectionForExport = internalQuery({
  args: {
    orgId: v.string(),
    userTokenIdentifier: v.string(),
  },
  handler: async (ctx, args): Promise<NotionConnection | null> => {
    return await ctx.db
      .query("notion_integrations")
      .withIndex("by_userTokenIdentifier_and_orgId", (q) =>
        q
          .eq("userTokenIdentifier", args.userTokenIdentifier)
          .eq("orgId", args.orgId),
      )
      .unique();
  },
});

export const updateNotionConnectionState = internalMutation({
  args: {
    connectionId: v.id("notion_integrations"),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    workspaceId: v.optional(v.string()),
    workspaceName: v.optional(v.string()),
    workspaceIcon: v.optional(v.string()),
    botId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    duplicatedTemplateId: v.optional(v.string()),
    targetPageId: v.optional(v.string()),
    status: v.optional(NOTION_CONNECTION_STATUS_VALIDATOR),
    lastError: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: {
      accessToken?: string;
      refreshToken?: string;
      workspaceId?: string;
      workspaceName?: string;
      workspaceIcon?: string;
      botId?: string;
      tokenType?: string;
      duplicatedTemplateId?: string;
      targetPageId?: string;
      status?: "connected" | "error" | "revoked";
      lastError?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (typeof args.accessToken === "string") {
      patch.accessToken = args.accessToken;
    }
    if (typeof args.refreshToken === "string") {
      patch.refreshToken = args.refreshToken;
    }
    if (typeof args.workspaceId === "string") {
      patch.workspaceId = args.workspaceId;
    }
    if (typeof args.workspaceName === "string") {
      patch.workspaceName = args.workspaceName;
    }
    if (typeof args.workspaceIcon === "string") {
      patch.workspaceIcon = args.workspaceIcon;
    }
    if (typeof args.botId === "string") {
      patch.botId = args.botId;
    }
    if (typeof args.tokenType === "string") {
      patch.tokenType = args.tokenType;
    }
    if (typeof args.duplicatedTemplateId === "string") {
      patch.duplicatedTemplateId = args.duplicatedTemplateId;
    }
    if (typeof args.targetPageId === "string") {
      patch.targetPageId = args.targetPageId;
    }
    if (args.status) {
      patch.status = args.status;
    }
    if (args.lastError !== undefined) {
      patch.lastError = args.lastError ?? undefined;
    }

    await ctx.db.patch(args.connectionId, patch);
  },
});

export const upsertMeetingExportState = internalMutation({
  args: {
    meetingId: v.id("meetings"),
    provider: v.literal("notion"),
    status: MEETING_EXPORT_STATUS_VALIDATOR,
    exportedByTokenIdentifier: v.string(),
    externalId: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meeting_exports")
      .withIndex("by_meetingId_and_provider", (q) =>
        q.eq("meetingId", args.meetingId).eq("provider", args.provider),
      )
      .unique();

    const now = Date.now();
    const payload = {
      provider: args.provider,
      status: args.status,
      exportedByTokenIdentifier: args.exportedByTokenIdentifier,
      externalId: args.externalId,
      externalUrl: args.externalUrl,
      lastError: args.lastError,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("meeting_exports", {
      meetingId: args.meetingId,
      ...payload,
      createdAt: now,
    });
  },
});

export const exportMeetingToNotion = action({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ pageId: string; pageUrl: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const meeting: {
      _id: Id<"meetings">;
      title: string;
      purpose: string;
      description?: string;
      status: "scheduled" | "active" | "ended";
      orgId: string;
      scheduledFor?: number;
      scheduledEndsAt?: number;
      scheduledTimeZone?: string;
      summary: string | null;
      key_points: string[];
      decisions: string[];
      action_items: Array<{ task: string; assignee?: string | null; due?: string | null }>;
    } = await ctx.runQuery(api.meetings.index.get, {
      meetingId: args.meetingId,
    });

    const connection = await ctx.runQuery(
      internal.integrations.index.getNotionConnectionForExport,
      {
        orgId: meeting.orgId,
        userTokenIdentifier: identity.tokenIdentifier,
      },
    );

    if (!connection || connection.status === "revoked") {
      throw new Error("Connect Notion before exporting this meeting");
    }

    if (!connection.targetPageId) {
      throw new Error("Choose a Notion parent page before exporting");
    }

    const transcripts: Array<{ speakerName: string; text: string; timestamp: number }> =
      await ctx.runQuery(api.transcripts.index.list, {
      meetingId: args.meetingId,
    });
    const recordings: Array<{
      playbackUrl?: string | null;
      startedAt: number;
      status: string;
    }> = await ctx.runQuery(api.recordings.index.listByMeeting, {
        meetingId: args.meetingId,
      });

    await ctx.runMutation(internal.integrations.index.upsertMeetingExportState, {
      meetingId: args.meetingId,
      provider: NOTION_PROVIDER,
      status: "pending",
      exportedByTokenIdentifier: identity.tokenIdentifier,
    });

    const blocks = buildNotionMeetingBlocks({
      meeting,
      transcripts,
      recordings,
    });

    let activeConnection: NotionExportConnection = {
      ...connection,
      targetPageId: connection.targetPageId,
    };

    const createOrAppendPage = async (
      currentConnection: NotionExportConnection,
    ): Promise<NotionPageCreateResponse> => {
      const [firstChunk, ...remainingChunks] = Array.from(
        { length: Math.ceil(blocks.length / NOTION_BLOCK_BATCH_SIZE) },
        (_, index) =>
          blocks.slice(
            index * NOTION_BLOCK_BATCH_SIZE,
            (index + 1) * NOTION_BLOCK_BATCH_SIZE,
          ),
      ).filter((chunk) => chunk.length > 0);

      const createdPage: NotionPageCreateResponse = await notionApiRequest<NotionPageCreateResponse>({
        method: "POST",
        path: "/pages",
        accessToken: currentConnection.accessToken,
        body: {
          parent: {
            page_id: currentConnection.targetPageId,
          },
          properties: {
            title: {
              title: createRichText(buildNotionMeetingPageTitle(meeting)),
            },
          },
          children: firstChunk,
        },
      });

      for (const chunk of remainingChunks) {
        await notionApiRequest({
          method: "PATCH",
          path: `/blocks/${createdPage.id}/children`,
          accessToken: currentConnection.accessToken,
          body: {
            children: chunk,
          },
        });
      }

      return createdPage;
    };

    try {
      const createdPage = await createOrAppendPage(activeConnection);
      await ctx.runMutation(internal.integrations.index.upsertMeetingExportState, {
        meetingId: args.meetingId,
        provider: NOTION_PROVIDER,
        status: "exported",
        exportedByTokenIdentifier: identity.tokenIdentifier,
        externalId: createdPage.id,
        externalUrl: createdPage.url,
      });
      await ctx.runMutation(internal.integrations.index.updateNotionConnectionState, {
        connectionId: activeConnection._id,
        status: "connected",
        lastError: undefined,
      });

      return {
        pageId: createdPage.id,
        pageUrl: createdPage.url ?? null,
      } as const;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export meeting to Notion";
      const status =
        error instanceof Error && "status" in error
          ? (error as Error & { status?: number }).status
          : undefined;

      if (activeConnection.refreshToken && isNotionAuthError(message, status)) {
        try {
          const refreshed = await exchangeNotionRefreshToken(activeConnection);
          await ctx.runMutation(internal.integrations.index.updateNotionConnectionState, {
            connectionId: activeConnection._id,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            workspaceId: refreshed.workspaceId ?? undefined,
            workspaceName: refreshed.workspaceName ?? undefined,
            workspaceIcon: refreshed.workspaceIcon ?? undefined,
            botId: refreshed.botId,
            tokenType: refreshed.tokenType ?? undefined,
            duplicatedTemplateId: refreshed.duplicatedTemplateId ?? undefined,
            status: "connected",
            lastError: undefined,
          });

          activeConnection = {
            ...activeConnection,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            workspaceId: refreshed.workspaceId ?? activeConnection.workspaceId,
            workspaceName: refreshed.workspaceName ?? activeConnection.workspaceName,
            workspaceIcon: refreshed.workspaceIcon ?? activeConnection.workspaceIcon,
            botId: refreshed.botId,
            tokenType: refreshed.tokenType ?? activeConnection.tokenType,
            duplicatedTemplateId:
              refreshed.duplicatedTemplateId ?? activeConnection.duplicatedTemplateId,
            status: "connected",
            lastError: undefined,
          };

          const createdPage = await createOrAppendPage(activeConnection);
          await ctx.runMutation(internal.integrations.index.upsertMeetingExportState, {
            meetingId: args.meetingId,
            provider: NOTION_PROVIDER,
            status: "exported",
            exportedByTokenIdentifier: identity.tokenIdentifier,
            externalId: createdPage.id,
            externalUrl: createdPage.url,
          });

          return {
            pageId: createdPage.id,
            pageUrl: createdPage.url ?? null,
          } as const;
        } catch (refreshError) {
          const refreshMessage =
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to refresh Notion access token";

          await ctx.runMutation(internal.integrations.index.updateNotionConnectionState, {
            connectionId: activeConnection._id,
            status: "error",
            lastError: refreshMessage,
          });
          await ctx.runMutation(internal.integrations.index.upsertMeetingExportState, {
            meetingId: args.meetingId,
            provider: NOTION_PROVIDER,
            status: "failed",
            exportedByTokenIdentifier: identity.tokenIdentifier,
            lastError: refreshMessage,
          });
          throw new Error(refreshMessage);
        }
      }

      await ctx.runMutation(internal.integrations.index.updateNotionConnectionState, {
        connectionId: activeConnection._id,
        status: isNotionAuthError(message, status) ? "error" : activeConnection.status,
        lastError: message,
      });
      await ctx.runMutation(internal.integrations.index.upsertMeetingExportState, {
        meetingId: args.meetingId,
        provider: NOTION_PROVIDER,
        status: "failed",
        exportedByTokenIdentifier: identity.tokenIdentifier,
        lastError: message,
      });
      throw new Error(message);
    }
  },
});

export const getMeetingGoogleCalendarSyncContext = internalQuery({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args): Promise<GoogleCalendarSyncContext | null> => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      return null;
    }

    const connection = await ctx.db
      .query("user_integrations")
      .withIndex("by_userTokenIdentifier_and_provider", (q) =>
        q
          .eq("userTokenIdentifier", meeting.hostUserTokenIdentifier)
          .eq("provider", GOOGLE_PROVIDER),
      )
      .unique();

    const attendeeEmails = new Set<string>();
    for await (const invite of ctx.db
      .query("meeting_invites")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))) {
      const status = resolveInviteStatus(invite);
      if (status === "cancelled" || status === "declined" || status === "expired") {
        continue;
      }

      attendeeEmails.add(normalizeInviteEmail(invite.email));
    }

    return {
      meeting,
      connection,
      attendeeEmails: [...attendeeEmails],
    };
  },
});

export const updateGoogleCalendarConnectionState = internalMutation({
  args: {
    connectionId: v.id("user_integrations"),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    status: v.optional(GOOGLE_CONNECTION_STATUS_VALIDATOR),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: {
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: number;
      status?: "connected" | "error" | "revoked";
      lastError?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (typeof args.accessToken === "string") {
      patch.accessToken = args.accessToken;
    }
    if (typeof args.refreshToken === "string") {
      patch.refreshToken = args.refreshToken;
    }
    if (typeof args.tokenExpiresAt === "number") {
      patch.tokenExpiresAt = args.tokenExpiresAt;
    }
    if (args.status) {
      patch.status = args.status;
    }
    if (typeof args.lastError === "string") {
      patch.lastError = args.lastError;
    }

    await ctx.db.patch(args.connectionId, patch);
  },
});

export const updateMeetingGoogleCalendarSyncState = internalMutation({
  args: {
    meetingId: v.id("meetings"),
    syncRequested: v.optional(v.boolean()),
    status: GOOGLE_SYNC_STATUS_VALIDATOR,
    eventId: v.optional(v.string()),
    eventUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, {
      googleCalendarSyncRequested: args.syncRequested,
      googleCalendarSyncStatus: args.status,
      googleCalendarEventId: args.eventId,
      googleCalendarEventUrl: args.eventUrl,
      googleCalendarLastSyncedAt: Date.now(),
      googleCalendarSyncError: args.error,
    });
  },
});

export const syncMeetingToGoogleCalendar = internalAction({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const syncContext: GoogleCalendarSyncContext | null = await ctx.runQuery(
      internal.integrations.index.getMeetingGoogleCalendarSyncContext,
      {
        meetingId: args.meetingId,
      },
    );

    if (!syncContext) {
      return null;
    }

    const { meeting, attendeeEmails } = syncContext;
    let connection = syncContext.connection;
    const publicAppUrl = getPublicAppUrl();

    console.info("[google-calendar] Starting meeting sync", {
      meetingId: args.meetingId,
      meetingTitle: meeting.title,
      syncRequested: meeting.googleCalendarSyncRequested ?? false,
      existingEventId: meeting.googleCalendarEventId ?? null,
      scheduledFor: formatLogTimestamp(meeting.scheduledFor),
      scheduledEndsAt: formatLogTimestamp(meeting.scheduledEndsAt),
      scheduledTimeZone: meeting.scheduledTimeZone ?? "UTC",
      attendeeCount: attendeeEmails.length,
      connectionStatus: connection?.status ?? null,
      connectionAccountEmail: connection?.accountEmail ?? null,
      connectionTokenExpiresAt: formatLogTimestamp(connection?.tokenExpiresAt),
      hasRefreshToken: Boolean(connection?.refreshToken),
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      hasConfiguredCalendarId: Boolean(process.env.GOOGLE_CALENDAR_ID),
      publicAppUrlConfigured: Boolean(publicAppUrl),
      publicAppUrl: publicAppUrl ?? null,
    });

    if (!meeting.scheduledFor) {
      console.warn("[google-calendar] Skipping sync because meeting is not scheduled", {
        meetingId: args.meetingId,
      });
      await ctx.runMutation(
        internal.integrations.index.updateMeetingGoogleCalendarSyncState,
        {
          meetingId: args.meetingId,
          syncRequested: meeting.googleCalendarSyncRequested,
          status: "failed",
          error: "Meeting is not scheduled, so it cannot be synced to Google Calendar.",
        },
      );
      return null;
    }

    if (!connection || connection.status !== "connected") {
      console.warn("[google-calendar] Skipping sync because Google Calendar is not connected", {
        meetingId: args.meetingId,
        connectionStatus: connection?.status ?? null,
        connectionAccountEmail: connection?.accountEmail ?? null,
      });
      await ctx.runMutation(
        internal.integrations.index.updateMeetingGoogleCalendarSyncState,
        {
          meetingId: args.meetingId,
          syncRequested: meeting.googleCalendarSyncRequested,
          status: "failed",
          error: "Google Calendar is not connected for this host.",
        },
      );
      return null;
    }

    try {
      if (connection.tokenExpiresAt <= Date.now() + 60_000) {
        const refreshed = await exchangeGoogleRefreshToken(connection);
        await ctx.runMutation(
          internal.integrations.index.updateGoogleCalendarConnectionState,
          {
            connectionId: connection._id,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            tokenExpiresAt: refreshed.tokenExpiresAt,
            status: "connected",
            lastError: undefined,
          },
        );

        connection = {
          ...connection,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          tokenExpiresAt: refreshed.tokenExpiresAt,
          status: "connected",
          lastError: undefined,
        };
      }

      const timeZone = meeting.scheduledTimeZone ?? "UTC";
      const scheduledEndsAt = resolveScheduledEndsAt(
        meeting.scheduledFor,
        meeting.scheduledEndsAt,
      );
      const joinUrl = getMeetingJoinUrl(meeting._id);
      if (!joinUrl) {
        console.warn(
          "[google-calendar] Public app URL is missing. Creating the event without a join link.",
          {
            meetingId: args.meetingId,
            publicAppUrlConfigured: Boolean(publicAppUrl),
          },
        );
      }
      const eventPayload = {
        summary: meeting.title,
        description: buildGoogleEventDescription({
          _id: meeting._id,
          title: meeting.title,
          purpose: meeting.purpose,
          description: meeting.description,
        }),
        location: joinUrl ?? undefined,
        source: joinUrl
          ? {
              title: "Meeting Bot",
              url: joinUrl,
            }
          : undefined,
        start: {
          dateTime: formatCalendarDateTimeInTimeZone(
            meeting.scheduledFor,
            timeZone,
          ),
          timeZone,
        },
        end: {
          dateTime: formatCalendarDateTimeInTimeZone(
            scheduledEndsAt,
            timeZone,
          ),
          timeZone,
        },
        attendees: attendeeEmails.map((email) => ({ email })),
        guestsCanInviteOthers: false,
        guestsCanModify: false,
      };

      const endpoint = meeting.googleCalendarEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.googleCalendarEventId}`
        : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      const method = meeting.googleCalendarEventId ? "PATCH" : "POST";

      console.info("[google-calendar] Sending event request", {
        meetingId: args.meetingId,
        method,
        endpoint,
        attendeeCount: attendeeEmails.length,
        hasJoinUrl: Boolean(joinUrl),
      });

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      const payload = (await response.json()) as
        | {
            id?: string;
            htmlLink?: string;
            error?: {
              message?: string;
            };
          }
        | {
            error?: {
              message?: string;
            };
          };

      if (!response.ok || !("id" in payload) || !payload.id) {
        console.error("[google-calendar] Event sync failed", {
          meetingId: args.meetingId,
          status: response.status,
          error: payload.error?.message ?? "Unable to sync Google Calendar event",
        });
        throw new Error(payload.error?.message ?? "Unable to sync Google Calendar event");
      }

      console.info("[google-calendar] Event sync succeeded", {
        meetingId: args.meetingId,
        eventId: payload.id,
        eventUrl: payload.htmlLink ?? null,
      });

      await ctx.runMutation(
        internal.integrations.index.updateMeetingGoogleCalendarSyncState,
        {
          meetingId: args.meetingId,
          syncRequested: true,
          status: "synced",
          eventId: payload.id,
          eventUrl: payload.htmlLink,
          error: undefined,
        },
      );

      return payload.id;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sync Google Calendar";

      console.error("[google-calendar] Meeting sync failed", {
        meetingId: args.meetingId,
        connectionId: connection?._id ?? null,
        error: message,
      });

      if (connection?._id && isGoogleCalendarAuthError(message)) {
        await ctx.runMutation(
          internal.integrations.index.updateGoogleCalendarConnectionState,
          {
            connectionId: connection._id,
            status: "error",
            lastError: message,
          },
        );
      }

      await ctx.runMutation(
        internal.integrations.index.updateMeetingGoogleCalendarSyncState,
        {
          meetingId: args.meetingId,
          syncRequested: meeting.googleCalendarSyncRequested,
          status: "failed",
          error: message,
        },
      );
      return null;
    }
  },
});
