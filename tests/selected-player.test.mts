// ============================================================================
// SELECTED-PLAYER BUTTON — regression test for PR #7 (Bug 1).
//
// The draw-page player picker marks a selected player with `.btn-selected`,
// which paints a solid accent fill with the strong foreground token
// (`--accent-fg-strong`). This test guarantees, for EVERY supported theme ×
// accent combination, that:
//   1. the selected-player button foreground meets the strong contrast target
//      against the solid accent fill;
//   2. the selected avatar-option / accent-chip foreground (`--accent-text`)
//      meets 4.5:1 against the accent-tinted surfaces it is actually painted
//      on (color-mix(accent 22%, card2) and color-mix(accent 20%, card)) —
//      the exact surfaces the previous plain-`card` guarantee missed;
//   3. the selected-player component state maps to the guaranteed class.
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
  mix,
  resolveTokens,
  ACCENTS,
  THEME_PALETTES,
  WORLD_PALETTES,
  ACCENT_FG_STRONG,
  ACCENT_TEXT_SURFACE_MIX,
  MIN_CONTRAST,
} = c;

const { playerPickerButtonClass } = await import("../src/lib/playerPicker.ts");

const globalsCss = readFileSync(
  fileURLToPath(new URL("../src/app/globals.css", import.meta.url)),
  "utf8",
);

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

/* ------------------------------------------- selected-player button (Bug 1) */

test("selected-player button class is the strong-guaranteed .btn-selected", () => {
  assert.match(playerPickerButtonClass(true), /btn-selected/);
  assert.match(playerPickerButtonClass(true), /\bbtn\b/);
});

test("unselected-player button class stays the dimmed recessed look", () => {
  assert.match(playerPickerButtonClass(false), /\bbtn\b/);
  assert.doesNotMatch(playerPickerButtonClass(false), /btn-selected/);
  assert.match(playerPickerButtonClass(false), /opacity-70/);
});

test("selected vs unselected states are visually distinct classes", () => {
  assert.notEqual(playerPickerButtonClass(true), playerPickerButtonClass(false));
});

test(".btn-selected uses the strong foreground token in globals.css", () => {
  const rule = globalsCss.match(/\.btn-selected\s*\{[^}]*\}/);
  assert.ok(rule, ".btn-selected rule must exist in globals.css");
  assert.match(rule![0], /--accent-fg-strong/);
  assert.match(rule![0], /var\(--accent\)/);
});

test("selected-player foreground meets the strong target on solid accent for every theme × accent", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    for (const accent of ACCENTS) {
      const t = resolveTokens(theme, accent.id);
      const ratio = contrastRatio(t.accentFgStrong, t.accent);
      assert.ok(
        ratio >= ACCENT_FG_STRONG,
        `${theme}/${accent.id}: accentFgStrong ${t.accentFgStrong} on accent ${t.accent} = ${ratio.toFixed(2)} < ${ACCENT_FG_STRONG}`,
      );
    }
  }
});

test("selected-player foreground meets the strong target on world signature accents", () => {
  for (const world of Object.keys(WORLD_PALETTES)) {
    const t = resolveTokens(world, "theme");
    const ratio = contrastRatio(t.accentFgStrong, t.accent);
    assert.ok(
      ratio >= ACCENT_FG_STRONG,
      `${world}: accentFgStrong ${t.accentFgStrong} on accent ${t.accent} = ${ratio.toFixed(2)} < ${ACCENT_FG_STRONG}`,
    );
  }
});

/* ----------------------------- accent-text on the real tinted surfaces */

test("accent-text meets 4.5:1 on the av-choice tinted surface (card2) for every theme × accent", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    for (const accent of ACCENTS) {
      const t = resolveTokens(theme, accent.id);
      const surface = mix(t.accent, t.card2, ACCENT_TEXT_SURFACE_MIX);
      const ratio = contrastRatio(t.accentText, surface);
      assert.ok(
        ratio >= MIN_CONTRAST,
        `${theme}/${accent.id}: accentText ${t.accentText} on tinted ${surface} = ${ratio.toFixed(2)} < ${MIN_CONTRAST}`,
      );
    }
  }
});

test("accent-text meets 4.5:1 on the chip-accent tinted surface (card) for every theme × accent", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    for (const accent of ACCENTS) {
      const t = resolveTokens(theme, accent.id);
      const surface = mix(t.accent, t.card, 0.2);
      const ratio = contrastRatio(t.accentText, surface);
      assert.ok(
        ratio >= MIN_CONTRAST,
        `${theme}/${accent.id}: accentText ${t.accentText} on chip surface ${surface} = ${ratio.toFixed(2)} < ${MIN_CONTRAST}`,
      );
    }
  }
});

test("accent-text meets 4.5:1 on tinted surfaces for world signature accents", () => {
  for (const world of Object.keys(WORLD_PALETTES)) {
    const t = resolveTokens(world, "theme");
    const avSurface = mix(t.accent, t.card2, ACCENT_TEXT_SURFACE_MIX);
    const chipSurface = mix(t.accent, t.card, 0.2);
    assert.ok(
      contrastRatio(t.accentText, avSurface) >= MIN_CONTRAST,
      `${world}: accentText on av-choice surface = ${contrastRatio(t.accentText, avSurface).toFixed(2)} < ${MIN_CONTRAST}`,
    );
    assert.ok(
      contrastRatio(t.accentText, chipSurface) >= MIN_CONTRAST,
      `${world}: accentText on chip surface = ${contrastRatio(t.accentText, chipSurface).toFixed(2)} < ${MIN_CONTRAST}`,
    );
  }
});

test("strong foreground is at least as contrasty as the plain accent-fg", () => {
  for (const theme of Object.keys(THEME_PALETTES)) {
    for (const accent of ACCENTS) {
      const t = resolveTokens(theme, accent.id);
      assert.ok(
        contrastRatio(t.accentFgStrong, t.accent) >= contrastRatio(t.accentFg, t.accent),
        `${theme}/${accent.id}: strong ${t.accentFgStrong} should not be less contrasty than ${t.accentFg}`,
      );
    }
  }
});

console.log(`\nselected-player: ${passed} tests passed`);
