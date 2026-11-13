import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LeagueProvider } from "@/components/LeagueProvider";
import { SettingsProvider, THEME_BOOT_SCRIPT } from "@/components/Settings";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "JACKAROO LEAGUE",
  description: "إدارة دوري الجاكارو: الترتيب، النقاط، الإحصائيات والإنجازات.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e131f" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SettingsProvider>
          <LeagueProvider>
            <Shell>{children}</Shell>
          </LeagueProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
