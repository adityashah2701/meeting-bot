const INVITATION_EMAIL_CONFIG_ERROR =
  "Invite email is not configured in Convex. Add INVITATION_FROM_EMAIL plus SMTP_URL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS to the deployment environment.";

function parseBoolean(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePort(value?: string) {
  if (!value) {
    return 587;
  }

  const port = Number.parseInt(value, 10);
  return Number.isFinite(port) ? port : 587;
}

export type InvitationEmailConfig =
  | {
      fromEmail: string;
      smtpUrl: string;
    }
  | {
      fromEmail: string;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    };

export function getInvitationEmailConfig() {
  const fromEmail = process.env.INVITATION_FROM_EMAIL;
  const smtpUrl = process.env.SMTP_URL;

  if (fromEmail && smtpUrl) {
    return {
      fromEmail,
      smtpUrl,
    } satisfies InvitationEmailConfig;
  }

  const host = process.env.SMTP_HOST;
  const port = parsePort(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER ?? process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD;

  if (fromEmail && host && user && pass) {
    return {
      fromEmail,
      host,
      port,
      secure: parseBoolean(process.env.SMTP_SECURE) || port === 465,
      user,
      pass,
    } satisfies InvitationEmailConfig;
  }

  return null;
}

export function getInvitationEmailConfigError() {
  return INVITATION_EMAIL_CONFIG_ERROR;
}
