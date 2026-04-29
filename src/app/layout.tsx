import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ticket-to-pr-demo | Jira → GitHub MCP",
  description:
    "Demo dashboard for an AI-style ticket-to-PR workflow using Atlassian and GitHub MCP from Next.js API routes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          fontSans.variable,
          fontMono.variable,
          "min-h-screen bg-background font-sans antialiased",
        )}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
