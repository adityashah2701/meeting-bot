import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendMeetingInviteEmail = internalAction({
  args: {
    inviteId: v.id("meeting_invites"),
    toEmail: v.string(),
    meetingTitle: v.string(),
    organizerName: v.string(),
    organizationName: v.string(),
    meetingLink: v.string(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.INVITATION_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return { sent: false, reason: "missing_config" } as const;
    }

    const when = typeof args.scheduledFor === "number"
      ? new Date(args.scheduledFor).toLocaleString()
      : "Live now";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [args.toEmail],
        subject: `Meeting invite: ${args.meetingTitle}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #171717;">
            <h2 style="margin-bottom: 12px;">You’ve been invited to a meeting</h2>
            <p><strong>${args.organizerName}</strong> invited you to <strong>${args.meetingTitle}</strong> in <strong>${args.organizationName}</strong>.</p>
            <p><strong>When:</strong> ${when}</p>
            <p style="margin: 20px 0;">
              <a href="${args.meetingLink}" style="display: inline-block; padding: 12px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px;">
                Open invitation
              </a>
            </p>
            <p style="font-size: 12px; color: #6b7280;">If the meeting is live, you can join instantly from the app.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      await response.text();
      return { sent: false, reason: "provider_error" } as const;
    }

    return { sent: true } as const;
  },
});
