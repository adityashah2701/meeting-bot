import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

const ORG_PRO_PLAN = "org:pro_plan";

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

export async function POST(request: Request) {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { orgId?: string }
    | null;
  const orgId = payload?.orgId?.trim();

  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
  }

  if (clerkAuth.orgId !== orgId) {
    return NextResponse.json(
      { error: "Switch to the target organization before syncing billing." },
      { status: 403 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexToken = await getConvexToken();
  if (!convexUrl || !convexToken) {
    return NextResponse.json({ error: "Billing sync is unavailable" }, { status: 500 });
  }

  const hasProPlan = clerkAuth.has({ plan: ORG_PRO_PLAN });
  const features = hasProPlan
    ? {
        unlimitedMeetings: true,
        aiSummary: true,
        notionExport: true,
        recording: true,
        googleCalendarSync: true,
      }
    : {
        unlimitedMeetings: false,
        aiSummary: false,
        notionExport: false,
        recording: false,
        googleCalendarSync: false,
      };

  const planKey: "starter" | "custom" | "pro" = hasProPlan ? "pro" : "starter";
  const planName = hasProPlan ? "Pro Plan" : "Starter";
  const maxMeetings = hasProPlan ? null : 10;

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(convexToken);

  await convex.mutation(api.billing.index.syncOrganizationBillingSnapshot, {
    orgId,
    planKey,
    planName,
    maxMeetings,
    features,
  });

  return NextResponse.json({
    ok: true,
    planKey,
    planName,
    maxMeetings,
    features,
    resolvedPlan: hasProPlan ? ORG_PRO_PLAN : null,
  });
}
