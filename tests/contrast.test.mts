// ============================================================================
// CONTRAST — WCAG colour-token guarantees for every theme × accent combo.
//
// Asserts the canonical palettes in src/lib/contrast.ts meet a ≥ 4.5:1 minimum
// for the text/background pairs the UI relies on, that the resolver fixes any
// low-contrast pair, that each theme keeps a distinct accent-text (no blanket
// single colour), and that the CSS fallback overrides in globals.css match the
// resolver for the light theme.
// ============================================================================

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const c = await import("../src/lib/contrast.ts");
const {
  contrastRatio,
  relativeLuminance,
  ensureContrast,
  mix,
  wcagLevel,
  resolveTokens,
  ACCENTS,
  THEME_PALETTES,
  WORLD_PALETTES,
  WORLD_ACCENTS,
  MIN_CONTRAST,
} = c;

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

/* ----------------------------------------------------------- WCAG math */

test("relative luminance of black is 0 and white is 1", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.ok(relativeLuminance("#ffffff") > 0.99);
});

test("contrast ratio is symmetric and bounded", () => {
  const r = contrastRatio("#000000", "#ffffff");
  assert.equal(r, 21);
  assert.equal(contrastRatio("#ffffff", "#000000"), r);
});

test("wcagLevel thresholds are correct", () => {
  assert.equal(wcagLevel(21), "AAA");
  assert.equal(wcagLevel(4.6), "AA");
  assert.equal(wcagLevel(4.4), "fail");
});

test("ensureContrast fixes a low-contrast pair", () => {
  // #999 on #ccc is low contrast; the fix must reach the minimum.
  const fixed = ensureContrast("#999999", "#cccccc", MIN_CONTRAST);
  assert.ok(contrastRatio(fixed, "#cccccc") >= MIN_CONTRAST);
});

test("mix interpolates linearly", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
});

/* --------------------------------------------------- theme × accent guarantees */

const textPairs = (t: ReturnType<typeof resolveTokens>) => [
  ["fg on card", t.fg, t.card],
  ["fg on card2", t.fg, t.card2],
  ["muted on card", t.muted, t.card],
  ["muted on card2", t.muted, t.card2],
  ["accent-fg on accent", t.accentFg, t.accent],
  ["accent-text on card", t.accentText, t.card],
  ["accent-text on card2", t.accentText, t.card2],
] as const;

test("every base theme × accent meets 4.5:1 on all text pairs", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    for (const accent of ACCENTS) {
      const t = resolveTokens(theme, accent.id);
      for (const [name, fg, bg] of textPairs(t)) {
        const r = contrastRatio(fg, bg);
        assert.ok(
          r >= MIN_CONTRAST,
          `${theme}/${accent.id} ${name}: ${r.toFixed(2)} < ${MIN_CONTRAST} (${fg} on ${bg})`,
        );
      }
    }
  }
});

test("every world × signature-accent meets 4.5:1 on all text pairs", () => {
  for (const world of Object.keys(WORLD_PALETTES)) {
    const t = resolveTokens(world, "theme");
    for (const [name, fg, bg] of textPairs(t)) {
      const r = contrastRatio(fg, bg);
      assert.ok(
        r >= MIN_CONTRAST,
        `world ${world} ${name}: ${r.toFixed(2)} < ${MIN_CONTRAST} (${fg} on ${bg})`,
      );
    }
  }
});

test("world palettes keep their own signature accent tokens", () => {
  for (const [world, accent] of Object.entries(WORLD_ACCENTS)) {
    const t = resolveTokens(world, "theme");
    assert.equal(t.accent, accent.accent, `${world} accent mismatch`);
    assert.ok(contrastRatio(t.accentFg, t.accent) >= MIN_CONTRAST);
  }
});

test("accent-text is not a blanket single colour across accents", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    const texts = new Set(ACCENTS.map((a) => resolveTokens(theme, a.id).accentText));
    // The default "theme" accent and a custom accent must resolve differently.
    assert.ok(texts.size >= 2, `${theme} collapsed accent-text to a single colour`);
  }
});

test("accent-text preserves hue on the light theme (not near-black)", () => {
  const gold = resolveTokens("light", "gold");
  // Dark-but-hued gold, not a flat near-black.
  assert.ok(gold.accentText.startsWith("#1c1200"));
  assert.ok(contrastRatio(gold.accentText, gold.card) >= MIN_CONTRAST);
});

/* --------------------------------------------------- CSS fallback consistency */

test("CSS light-theme accent-text fallback matches the resolver", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const accents = ["theme", "gold", "emerald", "sky", "rose", "violet", "orange"];
  for (const accent of accents) {
    const rule = new RegExp(
      `\\[data-theme="light"\\]\\[data-world="classic"\\]\\[data-accent="${accent}"\\]\\s*\\{[^}]*--accent-text:\\s*(#[0-9a-f]+)`,
      "i",
    );
    const m = css.match(rule);
    assert.ok(m, `missing CSS light fallback for accent ${accent}`);
    const expected = resolveTokens("light", accent).accentText;
    assert.equal(m![1]!.toLowerCase(), expected.toLowerCase(), `${accent} CSS/JS mismatch`);
  }
});

test("the generic accent-text mix still passes on dark themes", () => {
  for (const theme of ["dark", "amoled", "midnight"] as const) {
    const p = THEME_PALETTES[theme];
    for (const accent of ACCENTS) {
      const at = mix(accent.accent, p.fg, 0.78);
      assert.ok(
        contrastRatio(at, p.card) >= MIN_CONTRAST,
        `${theme}/${accent.id} generic mix fails on dark card`,
      );
    }
  }
});

console.log(`\ncontrast tests: ${passed} passed`);
