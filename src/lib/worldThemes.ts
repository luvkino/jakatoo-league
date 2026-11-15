/**
 * JACKAROO LEAGUE — MULTIVERSE THEMES (pure, dependency-free metadata)
 *
 * The seven "worlds" below are 100% free and available from the start: there
 * are no unlocks, currencies, shops or achievements attached to them.
 *
 * Every palette is original artwork. All music is synthesised on the fly by
 * `src/lib/audio/tracks.ts` — no external audio files, no copyrighted assets.
 */

export const WORLD_THEME_IDS = [
  "classic",
  "cyberpunk",
  "ocean",
  "arcade",
  "mushroom",
  "vice",
  "balatro",
  "desert",
] as const;

export type WorldTheme = (typeof WORLD_THEME_IDS)[number];

export interface WorldThemeMeta {
  id: WorldTheme;
  /** Arabic display name (RTL). */
  label: string;
  /** Short Arabic description of the atmosphere. */
  desc: string;
  /** Original soundtrack title (Arabic) — atmospheric, never a copy. */
  track: string;
  trackEn: string;
  bpm: number;
  /** Preview swatch colours used by the theme cards in Settings. */
  swatch: [string, string, string];
  /** Font/emoji-free pixel glyph used in the selector. */
  glyph: string;
}

export const WORLD_THEMES: WorldThemeMeta[] = [
  {
    id: "classic",
    label: "الكلاسيكي",
    desc: "مظهر الدوري الأصلي: أركيد داكن مع شبكة بكسل هادئة.",
    track: "ليلة الجاكارو",
    trackEn: "Jackaroo Night",
    bpm: 96,
    swatch: ["#0b0e1c", "#1c2448", "#fbbf24"],
    glyph: "★",
  },
  {
    id: "cyberpunk",
    label: "سايبربنك",
    desc: "نيون بنفسجي وأزرق ووردي مع أفق مدينة مستقبلية.",
    track: "نيون فوق المدينة",
    trackEn: "Neon Overdrive",
    bpm: 118,
    swatch: ["#0a0618", "#3a1b6e", "#ff2fd0"],
    glyph: "⚡",
  },
  {
    id: "ocean",
    label: "المحيط",
    desc: "أزرق عميق وفيروزي مع فقاعات وحركة ماء خفيفة.",
    track: "أعماق مرجانية",
    trackEn: "Coral Depths",
    bpm: 92,
    swatch: ["#021a2e", "#0a4f70", "#35e0d0"],
    glyph: "≈",
  },
  {
    id: "arcade",
    label: "الأركيد",
    desc: "صالة ألعاب ١٩٨٥: نيون، خطوط CRT، وحواف بكسل حادة.",
    track: "طاولة الأركيد",
    trackEn: "Insert Coin",
    bpm: 140,
    swatch: ["#0a0018", "#3a1663", "#ffe14d"],
    glyph: "▚",
  },
  {
    id: "mushroom",
    label: "مملكة الفطر",
    desc: "أجواء منصات ملوّنة: سحاب، أنابيب خضراء، وألوان مرحة.",
    track: "مملكة السحاب",
    trackEn: "Cloud Kingdom",
    bpm: 132,
    swatch: ["#15307a", "#2b62cf", "#ffcc33"],
    glyph: "◕",
  },
  {
    id: "vice",
    label: "فايس سيتي",
    desc: "غروب وردي، نخيل، ونيون ميامي على أفق شبكي.",
    track: "غروب الأطلسي",
    trackEn: "Atlantic Sunset",
    bpm: 104,
    swatch: ["#20103a", "#7a2050", "#ff7ab8"],
    glyph: "☀",
  },
  {
    id: "balatro",
    label: "الكازينو الغامض",
    desc: "بنفسجي وأحمر داكن مع تفاصيل أوراق اللعب.",
    track: "ورقة الحظ",
    trackEn: "Lucky Draw",
    bpm: 100,
    swatch: ["#120a16", "#43203a", "#e23b4e"],
    glyph: "♠",
  },
  {
    id: "desert",
    label: "الصحراء",
    desc: "رمال صفراء خفيفة، مختبرات كيمياء، وأجواء غامضة.",
    track: "حرارة الصحراء",
    trackEn: "Desert Heat",
    bpm: 88,
    swatch: ["#14140f", "#3a3a22", "#d8c34a"],
    glyph: "⌬",
  },
];

export const WORLD_THEME_MAP: Record<WorldTheme, WorldThemeMeta> = WORLD_THEMES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<WorldTheme, WorldThemeMeta>,
);

export function isWorldTheme(value: unknown): value is WorldTheme {
  return typeof value === "string" && (WORLD_THEME_IDS as readonly string[]).includes(value);
}

/** Safe fallback for old localStorage payloads / bad API input. */
export function normalizeWorldTheme(value: unknown): WorldTheme {
  return isWorldTheme(value) ? value : "classic";
}

/** The seven real "worlds" (everything except the untouched classic look). */
export const SELECTABLE_WORLDS: WorldTheme[] = WORLD_THEME_IDS.filter((id) => id !== "classic");

/**
 * Deterministic "random theme" picker. `seed` keeps it pure and testable.
 * Never returns `current` so the random button always visibly changes things.
 */
export function pickRandomWorld(seed: number, current?: WorldTheme): WorldTheme {
  const pool = SELECTABLE_WORLDS.filter((w) => w !== current);
  const list = pool.length > 0 ? pool : SELECTABLE_WORLDS;
  const idx = Math.abs(Math.floor(seed)) % list.length;
  return list[idx];
}
