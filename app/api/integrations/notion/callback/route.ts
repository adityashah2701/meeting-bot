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
  const stateCookie = cookieStore.get("notion-oauth-state")?.value;
  cookieStore.delete("notion-oauth-state");

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
      new URL(`${returnTo}?notion=access-denied`, request.url),
    );
  }

  if (!parsedState || !state || parsedState.state !== state || !code) {
    return NextResponse.redirect(
      new URL(`${returnTo}?notion=invalid-state`, request.url),
    );
  }

  const notionClientId = process.env.NOTION_CLIENT_ID;
  const notionClientSecret = process.env.NOTION_CLIENT_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const redirectUri = (
    process.env.NOTION_REDIRECT_URI
    ?? new URL("/api/integrations/notion/callback", request.url).toString()
  ).trim();

  if (!notionClientId || !notionClientSecret || !convexUrl) {
    return NextResponse.redirect(
      new URL(`${returnTo}?notion=missing-config`, request.url),
    );
  }

  const convexToken = await getConvexToken();
  if (!convexToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${notionClientId}:${notionClientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenPayload = (await tokenResponse.json()) as
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

  if (
    !tokenResponse.ok ||
    !("access_token" in tokenPayload) ||
    !tokenPayload.access_token ||
    !tokenPayload.bot_id
  ) {
    console.error("[notion] OAuth token exchange failed", {
      status: tokenResponse.status,
      error:
        "error_description" in tokenPayload && tokenPayload.error_description
          ? tokenPayload.error_description
          : "Unable to exchange the Notion authorization code",
    });
    return NextResponse.redirect(
      new URL(`${returnTo}?notion=token-error`, request.url),
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(convexToken);

  await convex.mutation(api.integrations.index.connectNotion, {
    orgId: parsedState.orgId,
    workspaceId: tokenPayload.workspace_id ?? undefined,
    workspaceName: tokenPayload.workspace_name ?? undefined,
    workspaceIcon: tokenPayload.workspace_icon ?? undefined,
    botId: tokenPayload.bot_id,
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenType: tokenPayload.token_type,
    duplicatedTemplateId: tokenPayload.duplicated_template_id ?? undefined,
  });

  return NextResponse.redirect(
    new URL(`${returnTo}?notion=connected`, request.url),
  );
}
