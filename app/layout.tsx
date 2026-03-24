import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dark } from "@clerk/ui/themes";
import { Providers } from "@/components/providers";
import { SyncUserWithConvex } from "@/components/sync-user-with-convex";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Meeting Bot",
    default: "Meeting Bot",
  },
  description: "Production-grade realtime meeting workspace powered by Next.js, Convex, and Clerk.",
  openGraph: {
    title: "Meeting Bot",
    description: "Production-grade realtime meeting workspace powered by Next.js, Convex, and Clerk.",
    siteName: "Meeting Bot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meeting Bot",
    description: "Production-grade realtime meeting workspace powered by Next.js, Convex, and Clerk.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
      }}
    >
      <TooltipProvider>
        <html
          lang="en"
          className={cn(
            "h-full dark",
            "antialiased",
            geistSans.variable,
            geistMono.variable,
            "font-sans",
            inter.variable,
          )}
          suppressHydrationWarning
        >
          <body className="min-h-full flex flex-col" suppressHydrationWarning>
            <Providers>
              <SyncUserWithConvex />
              {children}
            </Providers>
          </body>
        </html>
      </TooltipProvider>
    </ClerkProvider>
  );
}
