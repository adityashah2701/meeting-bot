import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildOutlookCalendarUrl,
  type CalendarInviteEvent,
} from "@/lib/calendar-invite";

type Provider = "google" | "outlook" | "ics";

function getProvider(value: string | null): Provider {
  if (value === "google" || value === "outlook" || value === "ics") {
    return value;
  }

  return "ics";
}

async function getConvexToken() {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return null;
  }

  if (clerkAuth.sessionClaims?.aud === "convex") {
    return await clerkAuth.getToken();
  }

  return await clerkAuth.getToken({ template: "convex" });
}

function buildEventDescription(event: {
  title: string;
  purpose: string;
  description: string;
  joinUrl: string;
}) {
  return [
    `Join meeting: ${event.joinUrl}`,
    `Meeting: ${event.title}`,
    event.purpose ? `Purpose: ${event.purpose}` : null,
    event.description ? `Notes: ${event.description}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "meeting-invite";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL is not configured" },
      { status: 500 },
    );
  }

  const { inviteId } = await context.params;
  const url = new URL(request.url);
  const provider = getProvider(url.searchParams.get("provider"));
  const token = url.searchParams.get("token") ?? undefined;

  const convex = new ConvexHttpClient(convexUrl);
  const convexToken = await getConvexToken();
  if (convexToken) {
    convex.setAuth(convexToken);
  }

  let invite:
    | {
        invitationId: string;
        meetingId: string;
        title: string;
        purpose: string;
        description: string;
        startsAt: number;
        endsAt: number;
        status: string;
      }
    | null = null;

  try {
    invite = await convex.query(api.invitations.index.getCalendarInvite, {
      invitationId: inviteId as never,
      token,
    });
  } catch {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const joinUrl = `${origin}/meeting/${invite.meetingId}`;
  const event: CalendarInviteEvent = {
    title: invite.title,
    description: buildEventDescription({
      title: invite.title,
      purpose: invite.purpose,
      description: invite.description,
      joinUrl,
    }),
    startsAt: invite.startsAt,
    endsAt: invite.endsAt,
    location: joinUrl,
    url: joinUrl,
  };

  if (provider === "google") {
    return NextResponse.redirect(buildGoogleCalendarUrl(event));
  }

  if (provider === "outlook") {
    return NextResponse.redirect(buildOutlookCalendarUrl(event));
  }

  const ics = buildIcsContent(event, `${invite.invitationId}@meeting-bot`);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(invite.title)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
