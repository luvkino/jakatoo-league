import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ChaosProvider } from "@/components/ChaosEngine";
import { LeagueProvider } from "@/components/LeagueProvider";
import { SettingsProvider, THEME_BOOT_SCRIPT } from "@/components/Settings";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "JACKAROO LEAGUE — 8-BIT EDITION",
  description: "إدارة دوري الجاكارو بطابع الأركيد والبكسل آرت: الترتيب، النقاط، الإحصائيات، الإنجازات، ووضع الفوضى.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0e1c" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" data-radius="sharp" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Handjet:wght@500;700;800&family=Press+Start+2P&family=Silkscreen:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased pixel-bg-grid">
        <SettingsProvider>
          <LeagueProvider>
            <ChaosProvider>
              <Shell>{children}</Shell>
            </ChaosProvider>
          </LeagueProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
