import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
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
    default: "Meeting Bot - AI-Powered Meeting Assistant",
  },
  description: "Automate your meetings, generate summaries, and track action items with Meeting Bot.",
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
        >
          <body className="min-h-full flex flex-col">
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
