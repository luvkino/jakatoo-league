// ============================================================================
// PIXEL-ART BACKGROUNDS — verifies the 7 world environments render as 8-bit
// pixel art (code-level checks; no browser visual test available).
//
// Asserts: hard edges (no blur / no smooth AA / no border-radius on shapes),
// pixel-aligned particles with image-rendering:pixelated, dithered gradients
// with hard colour stops, and that every world keeps its signature objects and
// animation controls (master toggle, intensity, reduced-motion).
// ============================================================================

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worlds = readFileSync(new URL("../src/app/worlds.css", import.meta.url), "utf8");

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

const WORLD_IDS = ["ocean", "cyberpunk", "arcade", "mushroom", "vice", "balatro", "desert"];

test("all seven worlds have a pixel palette block", () => {
  for (const id of WORLD_IDS) {
    assert.ok(worlds.includes(`.wenv-palette[data-palette="${id}"]`), `${id} palette present`);
  }
});

test("no blur or smooth AA anywhere in the world art", () => {
  assert.ok(!/filter:\s*blur/.test(worlds), "no filter:blur (pixel art has hard edges)");
  assert.ok(!/border-radius:\s*[1-9]/.test(worlds), "no non-zero border-radius on shapes");
});

test("pixel particles use image-rendering: pixelated", () => {
  assert.match(worlds, /image-rendering:\s*pixelated/);
  // Particle classes are hard squares.
  for (const cls of ["wenv-mote", "wenv-pixel-float", "wenv-sand-mote", "wenv-star"]) {
    const rule = new RegExp(`\\.${cls}\\s*\\{[^}]*border-radius:\\s*0`, "s");
    assert.match(worlds, rule, `${cls} is a hard square`);
  }
});

test("gradients use hard colour stops (pixel sky / dithering)", () => {
  // A pixel sky uses the multi-stop band syntax `#x 0 N%, #y N% M%`.
  assert.match(worlds, /#[0-9a-f]{6}\s+0\s+\d+%,\s*#[0-9a-f]{6}/i, "hard-band stepped sky");
  // Dithering uses repeating-linear-gradient with 1–2px hard bands.
  assert.ok((worlds.match(/repeating-linear-gradient/g) ?? []).length >= 6, "dithering patterns present");
  assert.match(worlds, /0 1px/, "1px dither bands");
  assert.match(worlds, /0 2px/, "2px dither bands");
});

test("each world keeps its signature objects", () => {
  const signatures: Record<string, string[]> = {
    ocean: ["wenv-seaweed", "wenv-fish", "wenv-bubble", "wenv-water-caustics", "wenv-ocean-floor"],
    cyberpunk: ["wenv-cityline", "wenv-grid-floor", "wenv-neon-sign", "wenv-rain", "wenv-glitch"],
    arcade: ["wenv-crt", "wenv-arcade-glyph", "wenv-star", "wenv-pixel-float"],
    mushroom: ["wenv-cloud", "wenv-hill", "wenv-qblock", "wenv-coin", "wenv-pipe"],
    vice: ["wenv-sun", "wenv-vice-water", "wenv-vice-city", "wenv-palm"],
    balatro: ["wenv-card", "wenv-suit-float", "wenv-casino-light", "wenv-balatro-vignette"],
    desert: ["wenv-desert-sun", "wenv-heat-haze", "wenv-mountain", "wenv-cactus", "wenv-sandstorm"],
  };
  for (const [world, classes] of Object.entries(signatures)) {
    for (const cls of classes) {
      assert.ok(worlds.includes(`.${cls}`), `${world} keeps ${cls}`);
    }
  }
});

test("animations are preserved (transform/opacity keyframes)", () => {
  for (const kf of [
    "wenv-fish-swim",
    "wenv-bubble-rise",
    "wenv-seaweed-sway",
    "wenv-grid-run",
    "wenv-rain-fall",
    "wenv-glyph-bob",
    "wenv-cloud-move",
    "wenv-coin-spin",
    "wenv-water-shimmer",
    "wenv-card-drift",
    "wenv-suit-bob",
    "wenv-sand-fly",
  ]) {
    assert.match(worlds, new RegExp(`@keyframes ${kf}`), `${kf} keyframe preserved`);
  }
});

test("master toggle, intensity levels and reduced-motion are preserved", () => {
  assert.match(worlds, /\.wenv-root\[data-bg="off"\] \*/);
  assert.match(worlds, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.wenv-root \*/);
  assert.match(worlds, /data-bg-level="1"/);
  assert.match(worlds, /data-bg-level="3"/);
});

test("pixel art does not break the readability plates", () => {
  assert.match(worlds, /html:not\(\[data-world="classic"\]\) \.card[\s\S]*background-color:\s*var\(--card\)/);
});

console.log(`\npixel-art tests: ${passed} passed`);
