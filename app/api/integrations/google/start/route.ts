import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];

function getSafeReturnToPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/integrations";
  }

  return value;
}

export async function GET(request: Request) {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.redirect(
      new URL("/integrations?googleCalendar=missing-config", request.url),
    );
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const returnTo = getSafeReturnToPath(url.searchParams.get("returnTo"));

  if (!orgId) {
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=missing-org`, request.url),
    );
  }

  const oauthState = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(
    "google-calendar-oauth-state",
    JSON.stringify({ state: oauthState, orgId, returnTo }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  const redirectUri = new URL(
    "/api/integrations/google/callback",
    request.url,
  ).toString();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  authUrl.searchParams.set("state", oauthState);

  return NextResponse.redirect(authUrl);
}
