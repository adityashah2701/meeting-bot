import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { assertOrgAccess, requireIdentity } from "../lib/auth";
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

type GoogleConnection = Doc<"user_integrations">;
type GoogleCalendarSyncContext = {
  meeting: Doc<"meetings">;
  connection: GoogleConnection | null;
  attendeeEmails: string[];
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
