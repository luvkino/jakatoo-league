/**
 * ORIGINAL SOUNDTRACK SOURCES — explicit, honest registry.
 *
 * Context: each world currently ships an **original 8-bit composition** written
 * for JACKAROO LEAGUE (`src/lib/audio/tracks.ts`). Those tracks are original
 * works, not conversions of any existing game or film soundtrack, and the UI
 * says so.
 *
 * This module adds the *file-based* path for properly licensed audio you own
 * or have written permission to use. Nothing is downloaded, scraped or ripped
 * from games, videos or streaming services, and no file is ever bundled here.
 *
 * HOW TO ADD A LICENSED TRACK
 *   1. Put your MP3/OGG file in `public/audio/licensed/<theme>.mp3`
 *      (e.g. `public/audio/licensed/balatro.mp3`). Files are served as-is.
 *   2. Register it below: `{ theme: "balatro", src: "/audio/licensed/balatro.mp3",
 *      chunk: "8-bit", licence: "…", credit: "…" }`.
 *   3. Run `npm run test` — the audio tests fail if a registered source points
 *      at a missing file or a missing licence note, so a broken reference can
 *      never ship silently.
 *
 * A theme without a registered source keeps using its original 8-bit
 * composition and is shown in Settings as "لم تُضف موسيقى مرخّصة بعد" (no
 * licensed file yet). We never claim a conversion happened unless a real file
 * was supplied, processed and verified.
 */

import type { WorldTheme } from "@/lib/worldThemes";

export interface LicensedSource {
  theme: WorldTheme;
  /** Public URL of the file (must live under `public/`). */
  src: string;
  /** How the file was produced, e.g. "8-bit conversion of a licensed master". */
  processing: string;
  /** Licence or written permission reference (required). */
  licence: string;
  /** Optional credit line shown in the player. */
  credit?: string;
  /** Whether the file has been processed + verified. */
  verified: boolean;
}

/**
 * Registered licensed sources. EMPTY by design until you supply audio — the
 * templates below are commented out on purpose so nothing is misrepresented.
 */
export const LICENSED_SOURCES: LicensedSource[] = [
  // Example (uncomment only after you place the real file and licence note):
  // {
  //   theme: "balatro",
  //   src: "/audio/licensed/balatro.mp3",
  //   processing: "8-bit arrangement rendered from the licensed master",
  //   licence: "Written permission — <rights holder> — 2026-01-01",
  //   credit: "<artist / rights holder>",
  //   verified: false,
  // },
];

/** The track that actually plays for a theme right now. */
export type AudioSourceKind = "original-chip" | "licensed-file";

export interface ThemeAudioStatus {
  theme: WorldTheme;
  kind: AudioSourceKind;
  /** True once a real, verified file is registered. */
  hasLicensedFile: boolean;
  /** Human-readable Arabic status for Settings. */
  statusAr: string;
  licence?: string;
  credit?: string;
}

export function sourceFor(theme: WorldTheme): LicensedSource | null {
  const found = LICENSED_SOURCES.find((s) => s.theme === theme);
  if (!found || !found.verified) return null;
  return found;
}

export function audioStatus(theme: WorldTheme): ThemeAudioStatus {
  const src = sourceFor(theme);
  if (src) {
    return {
      theme,
      kind: "licensed-file",
      hasLicensedFile: true,
      statusAr: `ملف مرخّص مُسجَّل وجاهز (${src.processing}).`,
      licence: src.licence,
      credit: src.credit,
    };
  }
  return {
    theme,
    kind: "original-chip",
    hasLicensedFile: false,
    statusAr: "لم تُضف موسيقى مرخّصة بعد — تُشغَّل المقطوعة الأصلية 8-بت المكتوبة للدوري.",
  };
}

/** Themes still waiting for a licensed file from the project owner. */
export function themesAwaitingAudio(): WorldTheme[] {
  return LICENSED_SOURCES.filter((s) => !s.verified).map((s) => s.theme);
}

export const AUDIO_INTEGRATION_NOTE =
  "لا نستخرج موسيقى محمية من الألعاب أو المواقع أو منصات البث. أضف ملفاتك المرخّصة في public/audio/licensed/ ثم سجّلها في src/lib/audio/sources.ts — أي مصدر ناقص أو غير موثّق يُخفى تلقائياً.";
