import { auth } from "@clerk/nextjs/server";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import type {
  MinutesActionItem,
  MinutesDocumentData,
} from "@/features/meeting/lib/minutes-document";
import {
  buildMinutesDocumentDocx,
  buildMinutesFilename,
  getMinutesPreview,
} from "@/features/meeting/lib/minutes-document";
import {
  getInvitationEmailConfig,
  getInvitationEmailConfigError,
} from "@/lib/invitation-email-config";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RATE_LIMIT = 8;
const EMAIL_RATE_WINDOW_MS = 10 * 60 * 1000;

type SendMinutesEmailRequest = {
  orgId?: string;
  toEmail?: string;
  subject?: string;
  topic?: string;
  message?: string;
  meeting?: Partial<MinutesDocumentData> | null;
};

function normalizeSingleLine(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMultiline(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeSingleLine(item))
    .filter(Boolean)
    .slice(0, 20);
}

function sanitizeActionItems(value: unknown): MinutesActionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const task = typeof record.task === "string" ? normalizeSingleLine(record.task) : "";
      if (!task) {
        return null;
      }

      return {
        task,
        assignee: typeof record.assignee === "string"
          ? normalizeSingleLine(record.assignee)
          : null,
        due: typeof record.due === "string" ? normalizeSingleLine(record.due) : null,
      };
    })
    .filter((item): item is MinutesActionItem => Boolean(item))
    .slice(0, 25);
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRecipientEmails(value: string) {
  return [...new Set(
    value
      .split(/[,\s\n;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toHtmlParagraphs(value: string) {
  return escapeHtml(value).replace(/\n+/g, "<br />");
}

function formatMeetingDate(meeting: MinutesDocumentData) {
  const timestamp = meeting.endedAt ?? meeting.scheduledFor ?? meeting.createdAt;
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function sanitizeMeeting(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const meeting = value as Partial<MinutesDocumentData>;
  const title = typeof meeting.title === "string" ? normalizeSingleLine(meeting.title) : "";
  const summary = typeof meeting.summary === "string" ? normalizeMultiline(meeting.summary) : "";
  const createdAt = normalizeTimestamp(meeting.createdAt);

  if (!title || !summary || createdAt === null) {
    return null;
  }

  return {
    title,
    purpose: typeof meeting.purpose === "string" ? normalizeSingleLine(meeting.purpose) : null,
    status: typeof meeting.status === "string" ? normalizeSingleLine(meeting.status) : null,
    createdAt,
    scheduledFor: normalizeTimestamp(meeting.scheduledFor),
    endedAt: normalizeTimestamp(meeting.endedAt),
    summary,
    key_points: sanitizeStringArray(meeting.key_points),
    decisions: sanitizeStringArray(meeting.decisions),
    action_items: sanitizeActionItems(meeting.action_items),
    summaryUpdatedAt: normalizeTimestamp(meeting.summaryUpdatedAt),
  } satisfies MinutesDocumentData;
}

function buildEmailHtml(args: {
  subject: string;
  topic: string;
  message: string | null;
  meeting: MinutesDocumentData;
}) {
  const preview = getMinutesPreview(args.meeting);

  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 680px;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(args.subject)}</h2>
      <p style="margin: 0 0 20px;">Please find the attached minutes document for the meeting below.</p>
      <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; padding: 16px;">
        <p style="margin: 0 0 8px;"><strong>Meeting:</strong> ${escapeHtml(args.meeting.title)}</p>
        <p style="margin: 0 0 8px;"><strong>Topic:</strong> ${escapeHtml(args.topic)}</p>
        <p style="margin: 0;"><strong>Date:</strong> ${escapeHtml(formatMeetingDate(args.meeting))}</p>
      </div>
      ${
        args.message
          ? `<div style="margin-bottom: 20px;"><p style="margin: 0 0 6px;"><strong>Message</strong></p><p style="margin: 0;">${toHtmlParagraphs(args.message)}</p></div>`
          : ""
      }
      <div style="margin-bottom: 20px; border-left: 4px solid #111827; background: #f9fafb; padding: 12px 14px;">
        <p style="margin: 0 0 6px;"><strong>Preview</strong></p>
        <p style="margin: 0;">${escapeHtml(preview || "Attached is the complete meeting minutes document.")}</p>
      </div>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        The full professional minutes document is attached as a Word file.
      </p>
    </div>
  `;
}

function buildEmailText(args: {
  topic: string;
  message: string | null;
  meeting: MinutesDocumentData;
}) {
  const preview = getMinutesPreview(args.meeting);

  return [
    `Meeting: ${args.meeting.title}`,
    `Topic: ${args.topic}`,
    `Date: ${formatMeetingDate(args.meeting)}`,
    args.message ? `Message:\n${args.message}` : null,
    preview ? `Preview:\n${preview}` : null,
    "The full professional minutes document is attached as a Word file.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (
    isRateLimited(
      `minutes-email:${clerkAuth.userId}:${ip}`,
      EMAIL_RATE_LIMIT,
      EMAIL_RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Too many email requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const payload = (await request.json().catch(() => null)) as SendMinutesEmailRequest | null;
  const orgId = payload?.orgId ? normalizeSingleLine(payload.orgId) : "";
  const subject = payload?.subject ? normalizeSingleLine(payload.subject).slice(0, 160) : "";
  const topic = payload?.topic ? normalizeSingleLine(payload.topic).slice(0, 160) : "";
  const message = payload?.message ? normalizeMultiline(payload.message).slice(0, 2000) : null;
  const recipients = payload?.toEmail ? parseRecipientEmails(payload.toEmail) : [];
  const meeting = sanitizeMeeting(payload?.meeting);

  if (!orgId) {
    return NextResponse.json({ error: "Organization is required" }, { status: 400 });
  }

  if (clerkAuth.orgId !== orgId) {
    return NextResponse.json(
      { error: "Switch to the target organization before sending minutes." },
      { status: 403 },
    );
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required" }, { status: 400 });
  }

  const invalidEmail = recipients.find((email) => !isValidEmail(email));
  if (invalidEmail) {
    return NextResponse.json({ error: `Invalid recipient email: ${invalidEmail}` }, { status: 400 });
  }

  if (!subject) {
    return NextResponse.json({ error: "Email subject is required" }, { status: 400 });
  }

  if (!topic) {
    return NextResponse.json({ error: "Email topic is required" }, { status: 400 });
  }

  if (!meeting) {
    return NextResponse.json({ error: "A valid minutes document is required" }, { status: 400 });
  }

  const emailConfig = getInvitationEmailConfig();
  if (!emailConfig) {
    return NextResponse.json(
      { error: getInvitationEmailConfigError() },
      { status: 500 },
    );
  }

  const transporter = "smtpUrl" in emailConfig
    ? nodemailer.createTransport(emailConfig.smtpUrl)
    : nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.pass,
        },
      });

  try {
    await transporter.sendMail({
      from: emailConfig.fromEmail,
      to: recipients.join(", "),
      subject,
      text: buildEmailText({ topic, message, meeting }),
      html: buildEmailHtml({ subject, topic, message, meeting }),
      attachments: [
        {
          filename: `${buildMinutesFilename(meeting)}.docx`,
          content: Buffer.from(buildMinutesDocumentDocx(meeting)),
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Email provider rejected the minutes email.";
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
