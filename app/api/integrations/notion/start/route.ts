import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

  const notionClientId = process.env.NOTION_CLIENT_ID;
  if (!notionClientId) {
    return NextResponse.redirect(
      new URL("/integrations?notion=missing-config", request.url),
    );
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const returnTo = getSafeReturnToPath(url.searchParams.get("returnTo"));

  if (!orgId) {
    return NextResponse.redirect(
      new URL(`${returnTo}?notion=missing-org`, request.url),
    );
  }

  const oauthState = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(
    "notion-oauth-state",
    JSON.stringify({ state: oauthState, orgId, returnTo }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  const redirectUri = (
    process.env.NOTION_REDIRECT_URI
    ?? new URL("/api/integrations/notion/callback", request.url).toString()
  ).trim();

  const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authUrl.searchParams.set("client_id", notionClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("owner", "user");
  authUrl.searchParams.set("state", oauthState);

  return NextResponse.redirect(authUrl);
}
