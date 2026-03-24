export const PUBLIC_APP_URL_ERROR =
  "Public app URL is not configured. Falling back to http://localhost:3000.";

function normalizeAppUrlCandidate(candidate: string) {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getPublicAppUrl() {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeAppUrlCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "http://localhost:3000";
}

export function buildPublicAppUrl(pathname: string) {
  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    return null;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${baseUrl}${path}`;
}
