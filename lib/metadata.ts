import type { Metadata } from "next";

const siteName = "Meeting Bot";

function buildTitle(title: string) {
  return `${title} | ${siteName}`;
}

export function createMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: buildTitle(title),
      description,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: buildTitle(title),
      description,
    },
  };
}

export function createMeetingMetadata(title: string, description: string): Metadata {
  return createMetadata(title, description);
}
