/**
 * PLAYER PREFERENCES — pure model shared by client, server and tests.
 *
 * Everything here is additive to the existing `Appearance` store (colours,
 * density, radius, chaos mode…): the preferences below cover the new
 * multiverse theme, audio, screen shake and match-animation settings only.
 */

import { DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig } from "@/lib/avatar";
import { normalizeWorldTheme, type WorldTheme } from "@/lib/worldThemes";

/** Current preferences schema version — bumped only for future migrations. */
export const PREFS_VERSION = 2;

/** Background animation intensity levels (used by every world environment). */
export const CASINO_TABLE_IDS = ["classic", "vegas", "atlantic", "european", "highroller", "custom"] as const;
export type CasinoTablePref = (typeof CASINO_TABLE_IDS)[number];

export const BG_INTENSITIES = [0, 1, 2, 3] as const;
export type BgIntensity = (typeof BG_INTENSITIES)[number];

export const BG_INTENSITY_LABEL_AR: Record<BgIntensity, string> = {
  0: "ساكنة",
  1: "هادئة",
  2: "عادية",
  3: "حيوية",
};

export interface PlayerPrefs {
  v: number;
  /** Multiverse world theme (`classic` keeps the original look). */
  theme: WorldTheme;
  /** League player profile this browser belongs to (used for DB sync). */
  profilePlayerId: string | null;
  /** Audio */
  masterVolume: number; // 0..100
  musicVolume: number; // 0..100
  sfxVolume: number; // 0..100
  musicEnabled: boolean;
  sfxEnabled: boolean;
  /** Continuous arcade screen shake (OFF by default — opt-in only) */
  shakeEnabled: boolean;
  shakeIntensity: number; // 0..100  (0 = completely off)
  /** Master switch for the full-page living theme environments. */
  bgAnimations: boolean;
  /** Background animation intensity: 0 = still art, 1 = calm, 2 = normal, 3 = lively. */
  bgIntensity: BgIntensity;
  /** Casino-only SFX switch (independent from the league SFX switch). */
  casinoSfxEnabled: boolean;
  /** Remembered casino table. */
  casinoTable: CasinoTablePref;
  /** Animated match-result / live-ranking sequence */
  matchAnimations: boolean;
  /** Avatar draft kept in sync with the DB for the selected profile. */
  avatar: AvatarConfig;
}

export const DEFAULT_PREFS: PlayerPrefs = {
  v: PREFS_VERSION,
  theme: "classic",
  profilePlayerId: null,
  masterVolume: 80,
  musicVolume: 40,
  sfxVolume: 70,
  musicEnabled: true,
  sfxEnabled: false, // matches the previous opt-in default for 8-bit SFX
  // Screen shake is deliberately OFF by default: a polished game feature must
  // never make the website itself feel unstable.
  shakeEnabled: false,
  shakeIntensity: 15,
  bgAnimations: true,
  bgIntensity: 2,
  casinoSfxEnabled: true,
  casinoTable: "classic",
  matchAnimations: true,
  avatar: DEFAULT_AVATAR,
};

const clampPct = (value: unknown, fallback: number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
};

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const playerId = (value: unknown): string | null =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

/** Safe defaults for existing players that have no saved preferences yet. */
export function normalizeCasinoTable(value: unknown): CasinoTablePref {
  return typeof value === "string" && (CASINO_TABLE_IDS as readonly string[]).includes(value)
    ? (value as CasinoTablePref)
    : DEFAULT_PREFS.casinoTable;
}

export function normalizeBgIntensity(value: unknown): BgIntensity {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFS.bgIntensity;
  const clamped = Math.min(3, Math.max(0, Math.round(n)));
  return clamped as BgIntensity;
}

export function normalizePrefs(raw: unknown): PlayerPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS, avatar: { ...DEFAULT_AVATAR } };
  const r = raw as Record<string, unknown>;
  return {
    v: PREFS_VERSION,
    theme: normalizeWorldTheme(r.theme),
    profilePlayerId: playerId(r.profilePlayerId),
    masterVolume: clampPct(r.masterVolume, DEFAULT_PREFS.masterVolume),
    musicVolume: clampPct(r.musicVolume, DEFAULT_PREFS.musicVolume),
    sfxVolume: clampPct(r.sfxVolume, DEFAULT_PREFS.sfxVolume),
    musicEnabled: bool(r.musicEnabled, DEFAULT_PREFS.musicEnabled),
    sfxEnabled: bool(r.sfxEnabled, DEFAULT_PREFS.sfxEnabled),
    shakeEnabled: bool(r.shakeEnabled, DEFAULT_PREFS.shakeEnabled),
    shakeIntensity: clampPct(r.shakeIntensity, DEFAULT_PREFS.shakeIntensity),
    bgAnimations: bool(r.bgAnimations, DEFAULT_PREFS.bgAnimations),
    bgIntensity: normalizeBgIntensity(r.bgIntensity),
    casinoSfxEnabled: bool(r.casinoSfxEnabled, DEFAULT_PREFS.casinoSfxEnabled),
    casinoTable: normalizeCasinoTable(r.casinoTable),
    matchAnimations: bool(r.matchAnimations, DEFAULT_PREFS.matchAnimations),
    avatar: normalizeAvatar(r.avatar),
  };
}

/** Values that are stored server-side per player (never the identity itself). */
export interface ServerPrefs {
  theme: WorldTheme;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  shakeEnabled: boolean;
  shakeIntensity: number;
  bgAnimations: boolean;
  bgIntensity: BgIntensity;
  matchAnimations: boolean;
  casinoSfxEnabled: boolean;
  casinoTable: CasinoTablePref;
}

export function toServerPrefs(p: PlayerPrefs): ServerPrefs {
  return {
    theme: p.theme,
    masterVolume: p.masterVolume,
    musicVolume: p.musicVolume,
    sfxVolume: p.sfxVolume,
    musicEnabled: p.musicEnabled,
    sfxEnabled: p.sfxEnabled,
    shakeEnabled: p.shakeEnabled,
    shakeIntensity: p.shakeIntensity,
    bgAnimations: p.bgAnimations,
    bgIntensity: p.bgIntensity,
    matchAnimations: p.matchAnimations,
    casinoSfxEnabled: p.casinoSfxEnabled,
    casinoTable: p.casinoTable,
  };
}

export function mergeServerPrefs(local: PlayerPrefs, server: unknown): PlayerPrefs {
  const normalized = normalizePrefs({ ...local, ...(server as object), avatar: local.avatar });
  return { ...normalized, profilePlayerId: local.profilePlayerId };
}

/**
 * Screen-shake amplitude in CSS pixels for a 0..100 intensity.
 *
 * Rebuilt mapping — deliberately far gentler than the old linear curve so the
 * page never feels unstable:
 *   0 %  → 0px      (absolutely no movement)
 *   10 % → 0.36px   (barely perceptible)
 *   15 % → 0.57px   (the default)
 *   35 % → 1.50px   (Balatro-like nudge)
 *   50 % → 2.25px
 *   100% → 5px      (strongest, still controlled)
 * The t^1.15 curve keeps low settings genuinely subtle while still giving the
 * mid range a usable, game-feel nudge.
 */
export function shakeAmplitude(intensity: number): number {
  const pct = Math.min(100, Math.max(0, Number.isFinite(intensity) ? intensity : 0));
  if (pct <= 0) return 0;
  const t = pct / 100;
  const px = 5 * Math.pow(t, 1.15);
  return Math.round(px * 100) / 100;
}

/** Rotation amplitude (degrees) — a fraction of the translation, for polish. */
export function shakeRotation(intensity: number): number {
  const amp = shakeAmplitude(intensity);
  return Math.round(amp * 0.08 * 100) / 100;
}

/** The shake animation speed slows down as the amplitude drops. */
export function shakeDuration(intensity: number): number {
  const pct = Math.min(100, Math.max(0, Number.isFinite(intensity) ? intensity : 0));
  return Math.round((4.2 + (pct / 100) * 2.6) * 100) / 100;
}

export function shakeActive(p: PlayerPrefs, reducedMotion: boolean): boolean {
  if (reducedMotion) return false; // respect the OS preference
  return p.shakeEnabled && p.shakeIntensity > 0;
}

/** Background animations follow the master switch, intensity and OS setting. */
export function bgActive(p: PlayerPrefs, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  return p.bgAnimations && p.bgIntensity > 0;
}

/** Effective 0..1 gains after master volume + mute rules. */
export function audioLevels(p: PlayerPrefs, reducedMotion = false) {
  void reducedMotion;
  const master = p.masterVolume / 100;
  return {
    master,
    music: p.musicEnabled ? master * (p.musicVolume / 100) : 0,
    sfx: p.sfxEnabled ? master * (p.sfxVolume / 100) : 0,
  };
}

export const isMuted = (p: PlayerPrefs): boolean => p.masterVolume === 0;

/** Human-readable summary for the theme cards / status chips. */
export const THEME_PREVIEW_NOTE =
  "المعاينة تعرض الألوان والواجهة فقط، ولن تُحفظ إلا بعد الضغط على «تطبيق». جميع الثيمات مجانية ومتاحة فوراً.";
