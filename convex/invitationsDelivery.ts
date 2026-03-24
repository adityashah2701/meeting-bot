"use node";

import { v } from "convex/values";
import nodemailer from "nodemailer";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { formatMeetingTimeRange, resolveScheduledEndsAt } from "../lib/meeting-schedule";
import {
  getInvitationEmailConfig,
  getInvitationEmailConfigError,
} from "../lib/invitation-email-config";

export const sendMeetingInviteEmail = internalAction({
  args: {
    inviteId: v.id("meeting_invites"),
    toEmail: v.string(),
    meetingTitle: v.string(),
    organizerName: v.string(),
    organizationName: v.string(),
    meetingLink: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    scheduledEndsAt: v.optional(v.number()),
    scheduledTimeZone: v.optional(v.string()),
    scheduledLabel: v.optional(v.string()),
    calendarBaseUrl: v.optional(v.string()),
    inviteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const emailConfig = getInvitationEmailConfig();

    if (!emailConfig) {
      await ctx.runMutation(internal.invitationEmailState.markEmailDelivery, {
        inviteId: args.inviteId,
        emailDeliveryStatus: "failed",
        lastEmailError: getInvitationEmailConfigError(),
      });
      return { sent: false, reason: "missing_config" } as const;
    }

    const when = typeof args.scheduledFor === "number"
      ? args.scheduledLabel
        ?? formatMeetingTimeRange(
          args.scheduledFor,
          resolveScheduledEndsAt(args.scheduledFor, args.scheduledEndsAt),
          args.scheduledTimeZone,
        )
      : "Live now";
    const googleCalendarLink = args.calendarBaseUrl
      ? `${args.calendarBaseUrl}?provider=google&token=${encodeURIComponent(args.inviteToken)}`
      : null;
    const outlookCalendarLink = args.calendarBaseUrl
      ? `${args.calendarBaseUrl}?provider=outlook&token=${encodeURIComponent(args.inviteToken)}`
      : null;
    const icsDownloadLink = args.calendarBaseUrl
      ? `${args.calendarBaseUrl}?provider=ics&token=${encodeURIComponent(args.inviteToken)}`
      : null;

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
        to: args.toEmail,
        subject: `Meeting invite: ${args.meetingTitle}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #171717;">
            <h2 style="margin-bottom: 12px;">You’ve been invited to a meeting</h2>
            <p><strong>${args.organizerName}</strong> invited you to <strong>${args.meetingTitle}</strong> in <strong>${args.organizationName}</strong>.</p>
            <p><strong>When:</strong> ${when}</p>
            ${args.meetingLink ? `<p style="margin: 20px 0;">
              <a href="${args.meetingLink}" style="display: inline-block; padding: 12px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px;">
                Open invite inbox
              </a>
            </p>` : `<p style="margin: 20px 0; font-size: 13px; color: #b45309;">The app public URL is not configured yet, so a direct invite inbox link is not available in this email.</p>`}
            ${
              typeof args.scheduledFor === "number" && googleCalendarLink && outlookCalendarLink && icsDownloadLink
                ? `
            <div style="margin: 20px 0;">
              <p style="margin-bottoms: 10px; font-size: 13px; color: #4b5563;">Add this meeting to your calendar:</p>
              <div>
                <a href="${googleCalendarLink}" style="display: inline-block; margin-right: 8px; margin-bottom: 8px; padding: 10px 14px; border: 1px solid #d1d5db; color: #111827; text-decoration: none; border-radius: 10px;">
                  Google Calendar
                </a>
                <a href="${outlookCalendarLink}" style="display: inline-block; margin-right: 8px; margin-bottom: 8px; padding: 10px 14px; border: 1px solid #d1d5db; color: #111827; text-decoration: none; border-radius: 10px;">
                  Outlook
                </a>
                <a href="${icsDownloadLink}" style="display: inline-block; margin-bottom: 8px; padding: 10px 14px; border: 1px solid #d1d5db; color: #111827; text-decoration: none; border-radius: 10px;">
                  Apple / ICS
                </a>
              </div>
            </div>`
                : ""
            }
            <p style="font-size: 12px; color: #6b7280;">If the meeting is live, you can join instantly from the app.</p>
          </div>
        `,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Email provider rejected the invite email.";
      await ctx.runMutation(internal.invitationEmailState.markEmailDelivery, {
        inviteId: args.inviteId,
        emailDeliveryStatus: "failed",
        lastEmailError: errorMessage,
      });
      return { sent: false, reason: "provider_error" } as const;
    }

    await ctx.runMutation(internal.invitationEmailState.markEmailDelivery, {
      inviteId: args.inviteId,
      emailDeliveryStatus: "sent",
      lastEmailError: undefined,
    });

    return { sent: true } as const;
  },
});
