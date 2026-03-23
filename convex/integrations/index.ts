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

function getMeetingJoinUrl(meetingId: Id<"meetings">) {
  const appBaseUrl =
    process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!appBaseUrl) {
    return null;
  }

  return `${appBaseUrl.replace(/\/+$/, "")}/meeting/${meetingId}`;
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
    throw new Error(
      "error_description" in payload && payload.error_description
        ? payload.error_description
        : "Unable to refresh Google Calendar token",
    );
  }

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
      } as const;
    }

    return {
      connected: connection.status === "connected",
      provider: GOOGLE_PROVIDER,
      accountEmail: connection.accountEmail,
      status: connection.status,
      scope: connection.scope,
      tokenExpiresAt: connection.tokenExpiresAt,
      connectedAt: connection.connectedAt,
      updatedAt: connection.updatedAt,
      lastError: connection.lastError,
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
      refreshToken: args.refreshToken,
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
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: args.status,
      lastError: args.lastError,
      updatedAt: Date.now(),
    });
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

    if (!meeting.scheduledFor) {
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

      const startDate = new Date(meeting.scheduledFor);
      const endDate = new Date(meeting.scheduledFor + 60 * 60 * 1000);
      const joinUrl = getMeetingJoinUrl(meeting._id);
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
          dateTime: startDate.toISOString(),
          timeZone: meeting.scheduledTimeZone ?? "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: meeting.scheduledTimeZone ?? "UTC",
        },
        attendees: attendeeEmails.map((email) => ({ email })),
        guestsCanInviteOthers: false,
        guestsCanModify: false,
      };

      const endpoint = meeting.googleCalendarEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.googleCalendarEventId}`
        : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      const method = meeting.googleCalendarEventId ? "PATCH" : "POST";

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
        throw new Error(payload.error?.message ?? "Unable to sync Google Calendar event");
      }

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

      if (connection?._id) {
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
