// ============================================================================
// THEME PREVIEW LAYOUT — regression test for PR #7 (Bug 2).
//
// The theme-preview frame (.wenv-preview) sits in a fixed-width grid track
// (sm:grid-cols-[220px_minmax(0,1fr)]) on the right (RTL). With only
// `aspect-ratio` + `min-height` and no definite width, a browser can derive
// the frame width from min-height × ratio (~269px) instead of the 220px track,
// overflowing the track and overlapping the title/description/controls column.
//
// This test guards the exact constraints that keep the frame inside its track
// and keep the scaled scene clipped:
//   1. .wenv-preview has a definite inline-size (width: 100%; max-width: 100%)
//      so aspect-ratio can never blow the width past the grid track;
//   2. .wenv-preview and .wenv-preview-scene clip (overflow: hidden) and the
//      scene uses contain: paint, so the 100vw×100vh scaled stage can never
//      paint outside the frame;
//   3. the preview grid declares the 220px track and places the preview first.
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

const worldsCss = readFileSync(
  fileURLToPath(new URL("../src/app/worlds.css", import.meta.url)),
  "utf8",
);
const pickerSrc = readFileSync(
  fileURLToPath(new URL("../src/components/themes/WorldThemePicker.tsx", import.meta.url)),
  "utf8",
);

function rule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(escaped + "\\s*\\{[^}]*\\}"));
  return m ? m[0] : null;
}

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

test(".wenv-preview has a definite inline-size so aspect-ratio cannot overflow the track", () => {
  const r = rule(worldsCss, ".wenv-preview");
  assert.ok(r, ".wenv-preview rule must exist in worlds.css");
  assert.match(r, /width:\s*100%/);
  assert.match(r, /max-width:\s*100%/);
});

test(".wenv-preview keeps its pixel-art aspect ratio and minimum height", () => {
  const r = rule(worldsCss, ".wenv-preview");
  assert.match(r, /aspect-ratio:\s*16\s*\/\s*10/);
  assert.match(r, /min-height:\s*168px/);
});

test(".wenv-preview clips overflow so the frame never spills into the content column", () => {
  const r = rule(worldsCss, ".wenv-preview");
  assert.match(r, /overflow:\s*hidden/);
});

test(".wenv-preview-scene clips and contains paint so the scaled stage cannot escape", () => {
  const r = rule(worldsCss, ".wenv-preview-scene");
  assert.ok(r, ".wenv-preview-scene rule must exist");
  assert.match(r, /overflow:\s*hidden/);
  assert.match(r, /contain:\s*paint/);
});

test(".wenv-preview-stage is absolutely positioned and non-interactive", () => {
  const r = rule(worldsCss, ".wenv-preview-stage");
  assert.ok(r, ".wenv-preview-stage rule must exist");
  assert.match(r, /position:\s*absolute/);
  assert.match(r, /pointer-events:\s*none/);
});

test("preview grid declares the 220px track beside the content column", () => {
  assert.match(pickerSrc, /sm:grid-cols-\[220px_minmax\(0,1fr\)\]/);
});

test("the preview frame is the first grid child (right column in RTL)", () => {
  // WorldPreview is rendered before the description/controls column.
  const previewIdx = pickerSrc.indexOf("<WorldPreview");
  const contentIdx = pickerSrc.indexOf('className="flex min-w-0 flex-col gap-2"');
  assert.ok(previewIdx > -1, "WorldPreview must be rendered");
  assert.ok(contentIdx > -1, "description/controls column must be rendered");
  assert.ok(previewIdx < contentIdx, "preview frame must come before the content column");
});

console.log(`\ntheme-preview-layout: ${passed} tests passed`);
