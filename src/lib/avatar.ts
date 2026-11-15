/**
 * SIMPLE PIXEL-ART AVATAR MODEL (pure, dependency-free, unit tested)
 *
 * Deliberately small: 11 skin tones (8 natural + 3 fantasy), 8 hairstyles,
 * 8 hair colours, 5 eye styles, 8 outfits and 5 accessories. Everything fits
 * on the same 16×16 pixel grid so every combination lines up perfectly.
 * No unlocks, no paid items — every option is free and available immediately.
 */

export interface AvatarConfig {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  outfit: number;
  accessory: number;
}

export interface AvatarColorOption {
  name: string;
  color: string;
  /** Shadow/outline shade used to keep the pixel art readable. */
  shade: string;
}

export interface AvatarNameOption {
  id: number;
  name: string;
}

/** 8 natural tones + 3 unusual fantasy tones = 11. */
export const SKIN_TONES: AvatarColorOption[] = [
  { name: "فاتح جداً", color: "#ffe0c2", shade: "#e3b795" },
  { name: "فاتح", color: "#f6cfa6", shade: "#d7a97c" },
  { name: "قمحي", color: "#e8b98a", shade: "#c48f60" },
  { name: "ذهبي", color: "#d9a066", shade: "#b27b44" },
  { name: "زيتوني", color: "#c78b52", shade: "#9c6534" },
  { name: "برونزي", color: "#a96b3c", shade: "#7f4a24" },
  { name: "بني", color: "#7d4b28", shade: "#59331a" },
  { name: "داكن", color: "#54301c", shade: "#3a2013" },
  { name: "فضائي أخضر", color: "#7ee08a", shade: "#4fa95c" },
  { name: "فضائي أزرق", color: "#7cc6f2", shade: "#4b93bd" },
  { name: "فضائي بنفسجي", color: "#b998f5", shade: "#8566c2" },
];

export const HAIR_STYLES: AvatarNameOption[] = [
  { id: 0, name: "قصير" },
  { id: 1, name: "شوكي" },
  { id: 2, name: "طويل" },
  { id: 3, name: "ذيل فرس" },
  { id: 4, name: "أفرو" },
  { id: 5, name: "موهوك" },
  { id: 6, name: "غرة جانبية" },
  { id: 7, name: "صلع" },
];

export const HAIR_COLORS: AvatarColorOption[] = [
  { name: "أسود", color: "#1b1b26", shade: "#0c0c12" },
  { name: "بني داكن", color: "#4b2e1e", shade: "#2f1c11" },
  { name: "بني", color: "#8a5a2b", shade: "#5f3c1a" },
  { name: "أشقر", color: "#e8c35a", shade: "#b8973a" },
  { name: "أحمر", color: "#d13b3b", shade: "#9a2525" },
  { name: "أزرق", color: "#3f7fe0", shade: "#28549b" },
  { name: "بنفسجي", color: "#a05ce0", shade: "#7239a8" },
  { name: "رمادي", color: "#b9bfce", shade: "#8b92a1" },
];

export const EYE_STYLES: AvatarNameOption[] = [
  { id: 0, name: "عادي" },
  { id: 1, name: "واسع" },
  { id: 2, name: "مبتسم" },
  { id: 3, name: "حاد" },
  { id: 4, name: "نظارة شمسية" },
];

export interface OutfitOption extends AvatarNameOption {
  color: string;
  shade: string;
  trim: string;
}

export const OUTFITS: OutfitOption[] = [
  { id: 0, name: "قميص أزرق", color: "#2f6fe0", shade: "#1d4795", trim: "#cfe2ff" },
  { id: 1, name: "أحمر كلاسيكي", color: "#d13b46", shade: "#8f2129", trim: "#ffd9dc" },
  { id: 2, name: "درع فولاذي", color: "#8894aa", shade: "#5b6577", trim: "#e2e8f2" },
  { id: 3, name: "رداء أخضر", color: "#2f9e63", shade: "#1a6a40", trim: "#d4f7e2" },
  { id: 4, name: "معطف مختبر", color: "#e7ecf5", shade: "#b5bccb", trim: "#7fa8d8" },
  { id: 5, name: "سترة أركيد", color: "#8b3fd1", shade: "#5e258f", trim: "#f5d7ff" },
  { id: 6, name: "زي رمال", color: "#c8a35a", shade: "#94713a", trim: "#fff1c9" },
  { id: 7, name: "بدلة سوداء", color: "#2b2b38", shade: "#17171f", trim: "#ffd34d" },
];

export const ACCESSORIES: AvatarNameOption[] = [
  { id: 0, name: "بدون" },
  { id: 1, name: "قبعة" },
  { id: 2, name: "سماعات" },
  { id: 3, name: "وشاح" },
  { id: 4, name: "نظارة" },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 2,
  hair: 0,
  hairColor: 0,
  eyes: 0,
  outfit: 0,
  accessory: 0,
};

const clampIndex = (value: unknown, max: number, fallback: number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < 0 || i >= max) return fallback;
  return i;
};

/** Never throws: invalid/legacy payloads fall back to safe defaults per field. */
export function normalizeAvatar(raw: unknown): AvatarConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AVATAR };
  const r = raw as Record<string, unknown>;
  return {
    skin: clampIndex(r.skin, SKIN_TONES.length, DEFAULT_AVATAR.skin),
    hair: clampIndex(r.hair, HAIR_STYLES.length, DEFAULT_AVATAR.hair),
    hairColor: clampIndex(r.hairColor, HAIR_COLORS.length, DEFAULT_AVATAR.hairColor),
    eyes: clampIndex(r.eyes, EYE_STYLES.length, DEFAULT_AVATAR.eyes),
    outfit: clampIndex(r.outfit, OUTFITS.length, DEFAULT_AVATAR.outfit),
    accessory: clampIndex(r.accessory, ACCESSORIES.length, DEFAULT_AVATAR.accessory),
  };
}

export function avatarsEqual(a: AvatarConfig, b: AvatarConfig): boolean {
  return (
    a.skin === b.skin &&
    a.hair === b.hair &&
    a.hairColor === b.hairColor &&
    a.eyes === b.eyes &&
    a.outfit === b.outfit &&
    a.accessory === b.accessory
  );
}

/**
 * Deterministic randomisation: pass a seed (e.g. Math.random()*2**31) so the
 * behaviour stays pure and testable. `seed` is reduced internally.
 */
export function randomAvatar(seed: number): AvatarConfig {
  let s = Math.abs(Math.floor(seed)) || 1;
  const next = (max: number) => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s % max;
  };
  return {
    skin: next(SKIN_TONES.length),
    // style 7 is "bald": keep it rare so randomising still shows hair.
    hair: next(HAIR_STYLES.length + 3) % HAIR_STYLES.length,
    hairColor: next(HAIR_COLORS.length),
    eyes: next(EYE_STYLES.length),
    outfit: next(OUTFITS.length),
    accessory: next(ACCESSORIES.length + 2) % ACCESSORIES.length,
  };
}

export const AVATAR_OPTION_COUNTS = {
  skin: SKIN_TONES.length,
  hair: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  eyes: EYE_STYLES.length,
  outfit: OUTFITS.length,
  accessory: ACCESSORIES.length,
};
