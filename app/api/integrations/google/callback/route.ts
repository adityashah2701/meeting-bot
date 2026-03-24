import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

function getSafeReturnToPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/integrations";
  }

  return value;
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("google-calendar-oauth-state")?.value;
  cookieStore.delete("google-calendar-oauth-state");

  let parsedState:
    | {
        state: string;
        orgId: string;
        returnTo: string;
      }
    | null = null;

  if (stateCookie) {
    try {
      parsedState = JSON.parse(stateCookie) as {
        state: string;
        orgId: string;
        returnTo: string;
      };
    } catch {
      parsedState = null;
    }
  }

  const returnTo = getSafeReturnToPath(parsedState?.returnTo);

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=access-denied`, request.url),
    );
  }

  if (!parsedState || !state || parsedState.state !== state || !code) {
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=invalid-state`, request.url),
    );
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!googleClientId || !googleClientSecret || !convexUrl) {
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=missing-config`, request.url),
    );
  }

  const convexToken = await getConvexToken();
  if (!convexToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const redirectUri = new URL(
    "/api/integrations/google/callback",
    request.url,
  ).toString();

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokenPayload = (await tokenResponse.json()) as
    | {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }
    | {
        error?: string;
        error_description?: string;
      };

  if (
    !tokenResponse.ok ||
    !("access_token" in tokenPayload) ||
    !tokenPayload.access_token
  ) {
    console.error("[google-calendar] OAuth token exchange failed", {
      status: tokenResponse.status,
      error:
        "error_description" in tokenPayload && tokenPayload.error_description
          ? tokenPayload.error_description
          : "Unable to exchange the Google authorization code",
    });
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=token-error`, request.url),
    );
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });
  const profilePayload = (await profileResponse.json()) as
    | {
        email?: string;
      }
    | {
        error?: {
          message?: string;
        };
      };

  if (
    !profileResponse.ok ||
    !("email" in profilePayload) ||
    !profilePayload.email
  ) {
    console.error("[google-calendar] Unable to load Google profile", {
      status: profileResponse.status,
      error: "error" in profilePayload ? profilePayload.error?.message : undefined,
    });
    return NextResponse.redirect(
      new URL(`${returnTo}?googleCalendar=profile-error`, request.url),
    );
  }

  console.info("[google-calendar] OAuth callback succeeded", {
    accountEmail: profilePayload.email,
    hasRefreshToken: Boolean(tokenPayload.refresh_token),
    tokenExpiresAt: new Date(
      Date.now() + Math.max(tokenPayload.expires_in ?? 3600, 60) * 1000,
    ).toISOString(),
    scopeCount: tokenPayload.scope?.split(" ").filter(Boolean).length ?? 0,
  });

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(convexToken);

  await convex.mutation(api.integrations.index.connectGoogleCalendar, {
    orgId: parsedState.orgId,
    accountEmail: profilePayload.email,
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    scope: tokenPayload.scope?.split(" ").filter(Boolean) ?? [],
    tokenExpiresAt:
      Date.now() + Math.max(tokenPayload.expires_in ?? 3600, 60) * 1000,
  });

  return NextResponse.redirect(
    new URL(`${returnTo}?googleCalendar=connected`, request.url),
  );
}
