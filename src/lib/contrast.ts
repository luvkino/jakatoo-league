/**
 * WCAG CONTRAST — single source of truth for the app's colour tokens.
 *
 * Every text/background pair the UI relies on is validated here. The same
 * palette values live in `src/app/globals.css` and `src/app/themes.css`; this
 * module mirrors them so the automated tests (tests/contrast.test.mts) can
 * assert a ≥ 4.5:1 minimum for every theme × accent combination without a
 * browser. When a value is adjusted here it must be mirrored in the CSS.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Palette {
  bg: string;
  card: string;
  card2: string;
  fg: string;
  muted: string;
  line: string;
  good: string;
  bad: string;
}

export interface AccentDef {
  id: string;
  accent: string;
  accentFg: string;
}

/* ------------------------------------------------------------- colour math */

export function parseHex(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: RGB): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linearise a channel (sRGB → linear) for relative luminance. */
function lin(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function wcagLevel(ratio: number): "AAA" | "AA" | "fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "fail";
}

/** Linear mix of two hex colours; t is the weight of `a` (0..1). */
export function mix(a: string, b: string, t: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  const k = Math.max(0, Math.min(1, t));
  return toHex({
    r: A.r * k + B.r * (1 - k),
    g: A.g * k + B.g * (1 - k),
    b: A.b * k + B.b * (1 - k),
  });
}

/**
 * Darken/lighten a colour until it meets a contrast minimum against `bg`.
 * Returns a colour no darker than `min` steps from black and no lighter than
 * white, always meeting the target (or the best achievable).
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  // Increase the luminance spread: push toward white if the foreground is
  // already lighter than the background, toward black if it is darker.
  const wantLighter = fgLum > bgLum;
  for (let step = 1; step <= 100; step++) {
    const t = step / 100;
    const candidate = wantLighter
      ? mix(fg, "#ffffff", t)
      : mix(fg, "#000000", t);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return wantLighter ? "#ffffff" : "#000000";
}

/* -------------------------------------------------------------- token registry */

export const ACCENTS: AccentDef[] = [
  { id: "theme", accent: "#a855f7", accentFg: "#150b36" }, // purple default
  { id: "gold", accent: "#fbbf24", accentFg: "#1c1200" },
  { id: "emerald", accent: "#22c55e", accentFg: "#03210f" },
  { id: "sky", accent: "#38bdf8", accentFg: "#021a26" },
  { id: "rose", accent: "#fb7185", accentFg: "#2b0610" },
  { id: "violet", accent: "#a78bfa", accentFg: "#150b36" },
  { id: "orange", accent: "#fb923c", accentFg: "#2b1200" },
];

/** Base theme palettes (match `[data-theme]` in globals.css). */
export const THEME_PALETTES: Record<string, Palette> = {
  dark: {
    bg: "#0b0e1c",
    card: "#141933",
    card2: "#1c2448",
    fg: "#eef2ff",
    muted: "#98a4cc",
    line: "#344482",
    good: "#34d399",
    bad: "#fb7185",
  },
  light: {
    bg: "#ece7d5",
    card: "#fbf8ec",
    card2: "#e3decb",
    fg: "#1b1b26",
    muted: "#525166",
    line: "#494558",
    good: "#15803d",
    bad: "#dc2626",
  },
  amoled: {
    bg: "#000000",
    card: "#090a12",
    card2: "#121524",
    fg: "#f4f4fb",
    muted: "#9ca0ba",
    line: "#31375c",
    good: "#34d399",
    bad: "#fb7185",
  },
  midnight: {
    bg: "#060921",
    card: "#0f1645",
    card2: "#182263",
    fg: "#e8edff",
    muted: "#9caae0",
    line: "#3c4db8",
    good: "#34d399",
    bad: "#fb7185",
  },
};

/**
 * Per-world palettes (match `[data-world]` in themes.css). These override the
 * base theme tokens when a multiverse world is active.
 */
export const WORLD_PALETTES: Record<string, Palette> = {
  cyberpunk: {
    bg: "#06020f",
    card: "#12082b",
    card2: "#1c0f45",
    fg: "#f2e9ff",
    muted: "#a08cd0",
    line: "#4c2a94",
    good: "#22e0b0",
    bad: "#ff4d6d",
  },
  ocean: {
    bg: "#04141f",
    card: "#082b3d",
    card2: "#0c3d54",
    fg: "#e6fbff",
    muted: "#8ec4d6",
    line: "#1d6b88",
    good: "#4ade80",
    bad: "#fb7185",
  },
  arcade: {
    bg: "#08000f",
    card: "#17062b",
    card2: "#240b45",
    fg: "#fff6d6",
    muted: "#b39ac9",
    line: "#5a1f8a",
    good: "#39ff88",
    bad: "#ff3860",
  },
  mushroom: {
    bg: "#2f6ad9",
    card: "#17408f",
    card2: "#2454a8",
    fg: "#ffffff",
    muted: "#cfe0ff",
    line: "#0d2a63",
    good: "#43d17a",
    bad: "#ef4444",
  },
  vice: {
    bg: "#180a2e",
    card: "#2a1140",
    card2: "#3a174f",
    fg: "#ffe8f4",
    muted: "#d6a3c4",
    line: "#7a2a63",
    good: "#52f0c8",
    bad: "#ff5470",
  },
  balatro: {
    bg: "#0e0710",
    card: "#1d0f1c",
    card2: "#2b1526",
    fg: "#f6e9e3",
    muted: "#b99a9a",
    line: "#5c2436",
    good: "#7ad1a0",
    bad: "#ff5a5a",
  },
  desert: {
    bg: "#100f0a",
    card: "#1d1c12",
    card2: "#2a2818",
    fg: "#f1edd8",
    muted: "#b7b193",
    line: "#4d4a2c",
    good: "#9bd46a",
    bad: "#e0733a",
  },
};

/** World-signature accents (match `[data-world][data-accent="theme"]`). */
export const WORLD_ACCENTS: Record<string, AccentDef> = {
  cyberpunk: { id: "theme", accent: "#ff2fd0", accentFg: "#1a0018" },
  ocean: { id: "theme", accent: "#35e0d0", accentFg: "#00201e" },
  arcade: { id: "theme", accent: "#ffe14d", accentFg: "#1c1400" },
  mushroom: { id: "theme", accent: "#ffcc33", accentFg: "#3a2200" },
  vice: { id: "theme", accent: "#ff7ab8", accentFg: "#2a0018" },
  balatro: { id: "theme", accent: "#e23b4e", accentFg: "#24040a" },
  desert: { id: "theme", accent: "#d8c34a", accentFg: "#1b1800" },
};

export interface ResolvedTokens {
  theme: string;
  accentId: string;
  bg: string;
  card: string;
  card2: string;
  fg: string;
  muted: string;
  line: string;
  good: string;
  bad: string;
  accent: string;
  accentFg: string;
  accentFgStrong: string;
  accentText: string;
}

/**
 * Target contrast for text painted on top of a solid accent background
 * (e. `btn-primary` / the draw-page selected-player button). 4.5 is the WCAG
 * AA floor; 4.9 gives a comfortable, clearly-readable margin. It is the best
 * target achievable for every accent: the weakest (the balatro world's
 * signature red) tops out at 4.97:1 with black text, so 4.9 is the highest
 * floor that holds across all theme × accent combinations.
 */
export const ACCENT_FG_STRONG = 4.9;

/**
 * Surface used by `av-choice[aria-checked="true"]` (and the accent-tinted
 * chips): `color-mix(accent 22%, card2)`. `--accent-text` must be guaranteed
 * against THIS surface, not plain `card` — for dark themes `card2` is lighter
 * than `card`, so the tinted surface is lighter and a light `--accent-text`
 * loses contrast exactly where the plain-card guarantee said it was safe.
 */
export const ACCENT_TEXT_SURFACE_MIX = 0.22;

/**
 * Resolve the full effective token set for a theme (or world) × accent.
 *
 * The returned text colours are guaranteed (by construction) to meet 4.5:1
 * against the surfaces they are actually painted on:
 *  - `fg` / `muted`        → `card`
 *  - `accentFg`            → solid `accent` (WCAG AA floor)
 *  - `accentFgStrong`      → solid `accent` (comfortable margin, for
 *                            selected-player / primary-button fills)
 *  - `accentText`          → the accent-tinted surface
 *                            `color-mix(accent 22%, card2)` used by
 *                            `av-choice[aria-checked=true]` / `chip-accent`
 * This is what the automated tests assert and what the live app applies via
 * Settings → documentElement.
 */
export function resolveTokens(
  theme: keyof typeof THEME_PALETTES | keyof typeof WORLD_PALETTES,
  accentId: string,
): ResolvedTokens {
  const inWorld = theme in WORLD_PALETTES;
  const pal = (inWorld ? WORLD_PALETTES : THEME_PALETTES)[theme as string] as Palette;
  const accent = inWorld && accentId === "theme"
    ? WORLD_ACCENTS[theme as string]
    : ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0]!;

  const fg = ensureContrast(pal.fg, pal.card, 4.5);
  const muted = ensureContrast(pal.muted, pal.card, 4.5);
  const accentFg = ensureContrast(accent.accentFg, accent.accent, 4.5);
  // Strong foreground for text on a solid accent fill (selected-player
  // buttons). Guaranteed at a comfortable margin above the AA floor.
  const accentFgStrong = ensureContrast(accent.accentFg, accent.accent, ACCENT_FG_STRONG);
  // accent-text sits on accent-tinted surfaces: `av-choice[aria-checked=true]`
  // paints it on `color-mix(accent 22%, card2)`, and `chip-accent` on
  // `color-mix(accent 20%, card)`. Guarantee it against the *tinted* surface
  // (the card2-based one is the most demanding for dark themes) — guaranteeing
  // against plain `card` alone let several theme × accent combinations fall
  // below 4.5:1 on the real painted surface.
  const accentTextBg = mix(accent.accent, pal.card2, ACCENT_TEXT_SURFACE_MIX);
  const cardLum = relativeLuminance(pal.card);
  const accentTextRaw = cardLum > 0.4 ? accent.accentFg : mix(accent.accent, pal.fg, 0.78);
  const accentText = ensureContrast(accentTextRaw, accentTextBg, 4.5);

  return {
    theme,
    accentId,
    bg: pal.bg,
    card: pal.card,
    card2: pal.card2,
    fg,
    muted,
    line: pal.line,
    good: pal.good,
    bad: pal.bad,
    accent: accent.accent,
    accentFg,
    accentFgStrong,
    accentText,
  };
}

export const MIN_CONTRAST = 4.5;
