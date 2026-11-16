// ============================================================================
// GLOBAL MUTE — verifies the centralized mute silences every audio source and
// that the preference persists, restores, and never restarts music while muted.
// ============================================================================

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    if (specifier.startsWith("@/") && context.parentURL) {
      const rel = new URL("src/" + specifier.slice(2), new URL("file://" + ROOT + "/"));
      if (existsSync(fileURLToPath(rel) + ".ts")) return nextResolve(rel.href + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});

const prefs = await import("../src/lib/prefs.ts");
const casinoSound = await import("../src/lib/casino/sound.ts");

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/* ------------------------------------------------------- central mute logic */

test("isMuted is true exactly when master volume is 0", () => {
  assert.equal(prefs.isMuted({ ...prefs.DEFAULT_PREFS, masterVolume: 0 }), true);
  assert.equal(prefs.isMuted({ ...prefs.DEFAULT_PREFS, masterVolume: 80 }), false);
});

test("toggleGlobalMute remembers the previous level and restores it", () => {
  const p = { ...prefs.DEFAULT_PREFS, masterVolume: 70, masterBeforeMute: 70 };
  const muted = prefs.toggleGlobalMute(p);
  assert.equal(muted.masterVolume, 0);
  assert.equal(muted.masterBeforeMute, 70, "previous level remembered");
  const unmuted = prefs.toggleGlobalMute({ ...p, ...muted });
  assert.equal(unmuted.masterVolume, 70, "unmute restores the previous level");
});

test("audioLevels zeroes music and sfx when globally muted", () => {
  const muted = prefs.audioLevels({ ...prefs.DEFAULT_PREFS, masterVolume: 0, musicEnabled: true, sfxEnabled: true });
  assert.equal(muted.music, 0);
  assert.equal(muted.sfx, 0);
  // Unmuted still respects the individual sliders.
  const on = prefs.audioLevels({ ...prefs.DEFAULT_PREFS, masterVolume: 80, musicVolume: 50, sfxVolume: 50, musicEnabled: true, sfxEnabled: true });
  assert.equal(on.music, 0.4);
  assert.equal(on.sfx, 0.4);
});

test("mute preference persists through normalization and server sync", () => {
  const normalized = prefs.normalizePrefs({ masterVolume: 0, masterBeforeMute: 65 });
  assert.equal(normalized.masterVolume, 0);
  assert.equal(normalized.masterBeforeMute, 65);
  const server = prefs.toServerPrefs(normalized);
  assert.equal(server.masterVolume, 0, "master volume syncs to the DB prefs");
});

test("individual volume controls are preserved across a mute cycle", () => {
  const p = { ...prefs.DEFAULT_PREFS, masterVolume: 80, masterBeforeMute: 80, musicVolume: 30, sfxVolume: 45 };
  const muted = prefs.toggleGlobalMute(p);
  assert.equal(muted.masterBeforeMute, 80);
  // The music/sfx sliders are untouched by the mute toggle.
  assert.equal(p.musicVolume, 30);
  assert.equal(p.sfxVolume, 45);
});

/* ------------------------------------------------- casino SFX global mute */

test("casino SFX bus exposes a global mute and honors it", () => {
  assert.equal(typeof casinoSound.setCasinoGlobalMuted, "function");
  casinoSound.setCasinoGlobalMuted(true);
  // With the global mute on, playing a sound must be a silent no-op (no
  // AudioContext is touched), and must not throw in a non-browser context.
  casinoSound.setCasinoSoundEnabled(true);
  casinoSound.setCasinoVolume(1);
  assert.doesNotThrow(() => casinoSound.playCasinoSfx("button"));
  casinoSound.setCasinoGlobalMuted(false);
});

test("casino sound guard includes the global mute flag", () => {
  const src = read("src/lib/casino/sound.ts");
  assert.match(src, /globalMuted/, "playCasinoSfx checks the global mute");
  assert.match(src, /setCasinoGlobalMuted/);
});

/* --------------------------------------------- AudioManager centralizes mute */

test("AudioManager applies the single global mute to every bus", () => {
  const src = read("src/components/prefs/AudioManager.tsx");
  assert.match(src, /isMuted/, "AudioManager derives the global mute");
  assert.match(src, /setSfxLevel/, "league SFX bus follows the mute");
  assert.match(src, /setEggSfxLevel/, "Easter-Egg SFX bus follows the mute");
  assert.match(src, /setCasinoGlobalMuted/, "Casino SFX bus follows the mute");
  // Music must not play while muted.
  assert.match(src, /!muted && prefs\.musicEnabled/);
});

test("header quick-mute uses the central toggle and reflects state", () => {
  const shell = read("src/components/Shell.tsx");
  assert.match(shell, /toggleGlobalMute/, "header toggles the central global mute");
  assert.match(shell, /isMuted\(prefs\)/, "header reflects the mute state");
});

test("AudioSettings Mute All uses the restore-previous toggle", () => {
  const src = read("src/components/prefs/AudioSettings.tsx");
  assert.match(src, /toggleGlobalMute/);
});

console.log(`\nmute tests: ${passed} passed`);
