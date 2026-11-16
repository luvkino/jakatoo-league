import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./themes.css";
import "./worlds.css";
import { ChaosProvider } from "@/components/ChaosEngine";
import { EasterEggProvider } from "@/components/easter/EasterEggProvider";
import { LeagueProvider } from "@/components/LeagueProvider";
import { SettingsProvider, THEME_BOOT_SCRIPT } from "@/components/Settings";
import { PlayerPrefsProvider, PREFS_BOOT_SCRIPT } from "@/components/prefs/PlayerPrefsProvider";
import { AudioManager } from "@/components/prefs/AudioManager";
import { ShakeDriver } from "@/components/prefs/ScreenShake";
import Shell from "@/components/Shell";
import { WorldEnvironment } from "@/components/themes/WorldEnvironment";

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
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SettingsProvider>
          <PlayerPrefsProvider>
            <ShakeDriver />
            <AudioManager />
            <LeagueProvider>
              <ChaosProvider>
                <EasterEggProvider>
                  <WorldEnvironment />
                  <Shell>{children}</Shell>
                </EasterEggProvider>
              </ChaosProvider>
            </LeagueProvider>
          </PlayerPrefsProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
