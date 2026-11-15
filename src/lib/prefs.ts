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
export const PREFS_VERSION = 1;

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
  /** Continuous arcade screen shake */
  shakeEnabled: boolean;
  shakeIntensity: number; // 0..100  (0 = completely off)
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
  shakeEnabled: true,
  shakeIntensity: 35,
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
  matchAnimations: boolean;
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
    matchAnimations: p.matchAnimations,
  };
}

export function mergeServerPrefs(local: PlayerPrefs, server: unknown): PlayerPrefs {
  const normalized = normalizePrefs({ ...local, ...(server as object), avatar: local.avatar });
  return { ...normalized, profilePlayerId: local.profilePlayerId };
}

/**
 * Screen-shake amplitude in CSS pixels for a 0..100 intensity.
 * 0 → 0 (feature completely off), 25 → ~1.6px, 50 → ~3.2px, 100 → ~6.5px.
 * Always subtle: the site must never look broken.
 */
export function shakeAmplitude(intensity: number): number {
  const pct = Math.min(100, Math.max(0, Number.isFinite(intensity) ? intensity : 0));
  return Math.round(((pct / 100) * 6.5) * 100) / 100;
}

export function shakeActive(p: PlayerPrefs, reducedMotion: boolean): boolean {
  if (reducedMotion) return false; // respect the OS preference
  return p.shakeEnabled && p.shakeIntensity > 0;
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
