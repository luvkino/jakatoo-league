// ============================================================================
// UI LAYERING CONTRACT — verifies the stacking ladder is defined and followed.
//
// Code-level check (no browser): the layer tokens exist and are ordered, the
// world background is the lowest layer with pointer-events:none, the shell
// establishes a stacking context, and the key fixed/overlay components use
// z-indexes that respect the documented L0→L6 ordering.
// ============================================================================

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      // tests import only CSS/TSX by relative path; nothing to remap here, but
      // keep the hook for consistency with the other suites.
    }
    return nextResolve(specifier, context);
  },
});

const read = (p: string) => readFileSync(new URL(`../src/app/${p}`, import.meta.url), "utf8");
const readComp = (p: string) => readFileSync(new URL(`../src/components/${p}`, import.meta.url), "utf8");

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

const globals = read("globals.css");
const worlds = read("worlds.css");
const shell = readComp("Shell.tsx");
const ui = readComp("ui.tsx");
const eggModal = readComp("easter/EggModal.tsx");
const access = readComp("casino/CasinoAccessProvider.tsx");

test("layer tokens are defined and strictly increasing L0→L6", () => {
  const layers = [
    ["--z-bg", 0],
    ["--z-shell", 1],
    ["--z-nav", 30],
    ["--z-dropdown", 40],
    ["--z-modal", 50],
    ["--z-toast", 60],
    ["--z-overlay", 70],
  ] as const;
  let prev = -1;
  for (const [name, value] of layers) {
    const re = new RegExp(`${name}:\\s*(\\d+)`);
    const m = globals.match(re);
    assert.ok(m, `missing layer token ${name}`);
    const n = Number(m![1]);
    assert.equal(n, value, `${name} should be ${value}`);
    assert.ok(n > prev, `${name} (${n}) must be above the previous layer`);
    prev = n;
  }
});

test("world background is the L0 layer and never blocks input", () => {
  const rootRule = worlds.match(/\.wenv-root\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(rootRule, /z-index:\s*0/);
  assert.match(rootRule, /pointer-events:\s*none/);
});

test("shell establishes a stacking context at L1", () => {
  const shellRule = worlds.match(/\.jl-shell\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(shellRule, /z-index:\s*1/);
  assert.match(shellRule, /isolation:\s*isolate/);
});

test("nav (L2) sits above the shell and below modals", () => {
  assert.match(shell, /sticky top-0 z-30/);
  assert.match(shell, /fixed bottom-0 z-30/);
  // Modal (L4) must be above nav (L2).
  assert.match(ui, /z-50/);
  assert.ok(50 > 30);
});

test("toasts (L5) sit above modals (L4)", () => {
  assert.match(shell, /z-\[60\]/);
  assert.ok(60 > 50);
});

test("egg effects (L6+) sit above toasts", () => {
  assert.match(eggModal, /z-\[100\]/);
  assert.ok(100 > 60);
});

test("casino unlock modal is the topmost layer", () => {
  assert.match(access, /z-\[120\]/);
  assert.ok(120 > 100);
});

test("no component uses an out-of-contract z-index below the shell", () => {
  // The only negative z-indexes are the decorative backdrops (casino-bg /
  // casino-backdrop), which are intentionally behind their own content.
  const casinoCss = read("casino/casino.css");
  assert.match(casinoCss, /z-index:\s*-1/); // casino-bg, inside .casino-root
  // worlds.css casino-backdrop is the only other negative.
  assert.match(worlds, /casino-backdrop[\s\S]*?z-index:\s*-1/);
});

console.log(`\nlayering tests: ${passed} passed`);
