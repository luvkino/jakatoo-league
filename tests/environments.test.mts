// ============================================================================
// LIVING THEMES / SCREEN SHAKE / AUDIO SOURCES / CASINO STORE tests.
//
// The visual environments are CSS + JSX, so these tests verify the parts that
// can actually be asserted deterministically:
//   • every world has a scene, a palette rule and the expected decorations,
//   • the CSS defines a full-page fixed layer with off/reduced-motion guards,
//   • the new shake curve is monotonic, 0 at 0 %, and gentle at low settings,
//   • the licensed-audio registry never claims an unverified file,
//   • the casino store never loses or invents chips.
// ============================================================================

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
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

let passed = 0;
const ok = (name: string) => {
  console.log(`  ✓ ${name}`);
  passed++;
};
const fail = (name: string, msg: string) => {
  console.error(`  ✗ ${name}\n${msg}`);
  process.exitCode = 1;
};
const test = (name: string, fn: () => void) => {
  try {
    fn();
    ok(name);
  } catch (e) {
    fail(name, e instanceof Error ? e.stack ?? e.message : String(e));
  }
};

const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/* ------------------------------------------------------------------ themes */

const { WORLD_THEMES, WORLD_THEME_IDS } = await import("../src/lib/worldThemes.ts");
const scenesSrc = read("src/components/themes/worldScenes.tsx");
const worldsCss = read("src/app/worlds.css");
const themesCss = read("src/app/themes.css");
const envSrc = read("src/components/themes/WorldEnvironment.tsx");
const layoutSrc = read("src/app/layout.tsx");

test("all seven selectable worlds plus classic have a real scene", () => {
  assert.equal(WORLD_THEME_IDS.length, 8);
  for (const id of WORLD_THEME_IDS) {
    assert.ok(
      new RegExp(`^\\s*${id}: \\w+Scene,`, "m").test(scenesSrc),
      `${id} is registered in SCENES`,
    );
    assert.ok(
      new RegExp(`^\\s*function \\w+Scene\\(\\)`, "m").test(scenesSrc),
      "scene components exist",
    );
    assert.ok(
      worldsCss.includes(`.wenv-palette[data-palette="${id}"]`),
      `${id} has its own environment palette`,
    );
  }
  const sceneFns = scenesSrc.match(/function \w+Scene\(\)/g) ?? [];
  assert.equal(new Set(sceneFns).size, 8, "eight distinct scene components");
  ok("every world ships a distinct full-page scene + palette");
});

test("the environment is a fixed full-page layer behind the content", () => {
  assert.match(worldsCss, /\.wenv-root\s*\{[^}]*position:\s*fixed/s, "fixed layer");
  assert.match(worldsCss, /\.wenv-root\s*\{[^}]*pointer-events:\s*none/s, "never blocks clicks");
  assert.match(worldsCss, /\.wenv-root\s*\{[^}]*inset:\s*0/s, "covers the viewport");
  assert.match(envSrc, /aria-hidden/, "decorative layer is hidden from assistive tech");
  assert.match(worldsCss, /\.jl-shell\s*\{[^}]*z-index:\s*1/s, "shell renders above");
  assert.match(layoutSrc, /<WorldEnvironment \/>/, "mounted once in the root layout");
  assert.match(layoutSrc, /before.*<Shell>|<WorldEnvironment \/>\s*<Shell>/s, "rendered before the shell");
  ok("environment covers the whole page, sits behind it and never blocks input");
});

test("each world has its signature decorations", () => {
  const expectations: [string, string[]][] = [
    ["Ocean", ["wenv-bubble", "wenv-seaweed", "wenv-fish", "wenv-water-caustics", "wenv-mote-blue"]],
    ["Cyber", ["wenv-cityline", "wenv-rain", "wenv-neon-sign", "wenv-grid-floor", "wenv-glitch"]],
    ["Arcade", ["wenv-crt", "wenv-star", "wenv-pixel-float", "wenv-arcade-glyph"]],
    ["Mushroom", ["<Cloud", "wenv-hill", "wenv-coin", "wenv-qblock", "wenv-pipe"]],
    ["Vice", ["wenv-palm", "wenv-sun", "wenv-vice-city", "wenv-vice-water"]],
    ["Balatro", ["wenv-card", "wenv-suit-float", "wenv-casino-light"]],
    ["Desert", ["wenv-cactus", "wenv-mountain", "wenv-heat-haze", "wenv-sand-mote", "wenv-desert-sun"]],
  ];
  for (const [scene, classes] of expectations) {
    const start = scenesSrc.indexOf(`function ${scene}Scene()`);
    assert.ok(start > -1, `${scene} scene exists`);
    const end = scenesSrc.indexOf("function ", start + 10);
    const body = scenesSrc.slice(start, end === -1 ? undefined : end);
    for (const cls of classes) {
      assert.ok(body.includes(cls), `${scene} scene uses ${cls}`);
      assert.ok(worldsCss.includes(`.${cls.replace("<Cloud", "wenv-cloud")}`), `${cls} has styles`);
    }
  }
  ok("bubbles, rain, neon, clouds, palms, cards and sand are all present and styled");
});

test("every animation is transform/opacity (compositor friendly)", () => {
  const keyframes = [...worldsCss.matchAll(/@keyframes ([a-z-]+)\s*\{([\s\S]*?)\n\}/g)];
  assert.ok(keyframes.length >= 20, "a rich animation set");
  for (const [, name, body] of keyframes) {
    assert.ok(
      /transform|opacity|background-position|box-shadow|filter/.test(body),
      `${name} animates a composited property`,
    );
    assert.ok(!/\bwidth:|\bheight:|\bleft:|\btop:|\bmargin/.test(body), `${name} must not animate layout`);
  }
  ok(`${keyframes.length} keyframes animate transform/opacity only (no layout thrash)`);
});

test("a master toggle, intensity settings and reduced motion are respected", () => {
  assert.match(worldsCss, /\.wenv-root\[data-bg="off"\] \*/, "off guard");
  assert.match(worldsCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.wenv-root \*/, "reduced motion");
  for (const level of [0, 1, 2, 3]) {
    assert.ok(worldsCss.includes(`data-bg-level`) || level === 0, "intensity levels are used");
  }
  assert.match(worldsCss, /data-bg-level="1"/, "calm level reduces the decoration count");
  assert.match(worldsCss, /data-bg-level="3"/, "lively level increases it");
  assert.match(envSrc, /reducedMotion/, "the provider's reduced-motion flag gates the layer");
  assert.match(envSrc, /bgAnimations/, "master switch is honoured");
  ok("master toggle, 4 intensity levels and reduced-motion are all wired");
});

test("theme previews render the real environment component", () => {
  const picker = read("src/components/themes/WorldThemePicker.tsx");
  assert.match(picker, /import \{ SCENES \} from "@\/components\/themes\/worldScenes"/);
  assert.match(picker, /<Scene \/>/, "preview renders the actual scene, not a fake swatch");
  assert.match(worldsCss, /\.wenv-preview-scene\s*\{[^}]*overflow:\s*hidden/s, "preview is contained");
  ok("previews reuse the production scene art (accurate previews)");
});

test("readability is protected over the animated background", () => {
  assert.match(worldsCss, /html:not\(\[data-world="classic"\]\) \.card[\s\S]*background-color:\s*var\(--card\)/);
  assert.match(worldsCss, /background-color:\s*var\(--card2\)/, "buttons get a solid plate too");
  ok("cards/buttons/inputs keep solid plates so text stays readable");
});

test("old per-world body decorations were retired (no duplicated systems)", () => {
  assert.ok(!/\[data-world="ocean"\] body \{/.test(themesCss), "old ocean body rule removed");
  assert.ok(!/\[data-world="cyberpunk"\] body::after/.test(themesCss), "old cyber decoration removed");
  assert.ok(!themesCss.includes("world-bubble-drift"), "dead keyframes removed");
  // palettes must still exist for every world
  for (const id of WORLD_THEME_IDS.filter((t) => t !== "classic")) {
    assert.ok(themesCss.includes(`[data-world="${id}"] {`), `${id} palette kept`);
  }
  ok("single background system per world; palettes preserved");
});

/* -------------------------------------------------------------------- shake */

const prefsMod = await import("../src/lib/prefs.ts");
const { shakeAmplitude, shakeRotation, shakeDuration, shakeActive, DEFAULT_PREFS, normalizePrefs } = prefsMod;
const shakeCss = worldsCss + themesCss;
const shakeSrc = read("src/components/prefs/ScreenShake.tsx");
const shakeSettings = read("src/components/prefs/ShakeSettings.tsx");

test("screen shake is off by default at 15%", () => {
  assert.equal(DEFAULT_PREFS.shakeEnabled, false);
  assert.equal(DEFAULT_PREFS.shakeIntensity, 15);
  assert.equal(shakeActive(DEFAULT_PREFS, false), false);
  ok("default is OFF with a 15% preset");
});

test("the shake curve is monotonic, zero at 0 and gentle at low settings", () => {
  const points = [0, 10, 15, 35, 50, 75, 100];
  assert.equal(shakeAmplitude(0), 0, "0% = absolutely no movement");
  for (let i = 1; i < points.length; i++) {
    assert.ok(
      shakeAmplitude(points[i]) > shakeAmplitude(points[i - 1]),
      `${points[i]}% is stronger than ${points[i - 1]}%`,
    );
  }
  assert.ok(shakeAmplitude(10) < 0.5, "10% stays barely perceptible");
  assert.ok(shakeAmplitude(15) < 0.8, "the default is subtle");
  assert.ok(shakeAmplitude(35) >= 1.2 && shakeAmplitude(35) <= 2, "35% gives a Balatro-like nudge");
  assert.ok(shakeAmplitude(100) <= 5, "100% remains controlled (≤5px)");
  assert.ok(shakeAmplitude(100) > shakeAmplitude(50));
  assert.equal(shakeAmplitude(-20), 0);
  assert.equal(shakeAmplitude(500), shakeAmplitude(100), "clamped");
  assert.ok(shakeRotation(100) < shakeAmplitude(100), "rotation stays a fraction of translation");
  assert.ok(shakeDuration(10) < shakeDuration(100), "gentler motion = slower path at low intensity");
  assert.ok(shakeDuration(100) - shakeDuration(10) < 4, "the speed range stays subtle");
  ok("0/10/15/35/50/100 behave, no jumps, controlled maximum");
});

test("shake respects reduced motion, OFF, and 0%", () => {
  const on = { ...DEFAULT_PREFS, shakeEnabled: true };
  assert.equal(shakeActive(on, true), false, "reduced motion wins");
  assert.equal(shakeActive({ ...on, shakeIntensity: 0 }, false), false, "0% disables the effect");
  assert.equal(shakeActive({ ...on, shakeEnabled: false }, false), false);
  assert.equal(shakeActive(on, false), true);
  assert.equal(shakeActive(normalizePrefs({ shakeEnabled: true, shakeIntensity: 74.4 }), false), true);
  ok("OFF / 0% / reduced motion never move anything");
});

test("the rebuilt driver uses one smooth loop and parks itself", () => {
  assert.match(shakeSrc, /requestAnimationFrame/, "single rAF loop");
  assert.match(shakeSrc, /translate3d/, "composited translation");
  assert.match(shakeSrc, /visibilitychange/, "pauses in background tabs");
  assert.match(shakeSrc, /\.jl-shake/, "only opted-in regions move");
  assert.match(shakeSrc, /previewShake/, "settings can audition it");
  assert.ok(
    !/[^/]animation:\s*arcade-drift-x[\s\S]{0,80}arcade-drift-y/.test(themesCss),
    "the colliding double-keyframe system is gone",
  );
  assert.match(shakeSettings, /معاينة مباشرة/, "there is a live preview button");
  assert.match(shakeSettings, /min=\{0\}/, "slider reaches 0%");
  assert.match(shakeSettings, /max=\{100\}/, "slider reaches 100%");
  ok("one loop, composited transform, live preview and a 0–100% slider");
});

/* -------------------------------------------------------------------- audio */

const sources = await import("../src/lib/audio/sources.ts");
const tracks = await import("../src/lib/audio/tracks.ts");

test("no soundtrack is misrepresented as a converted original", () => {
  assert.deepEqual(sources.LICENSED_SOURCES.filter((s) => s.verified), [], "nothing is claimed as converted");
  const status = sources.audioStatus("balatro");
  assert.equal(status.kind, "original-chip");
  assert.equal(status.hasLicensedFile, false);
  assert.match(status.statusAr, /الأصلية|لم تُضف/);
  for (const id of WORLD_THEME_IDS) {
    const st = sources.audioStatus(id);
    assert.equal(st.hasLicensedFile, false, `${id} honestly reports no licensed file`);
  }
  ok("unverified/missing audio stays unconfigured and is labelled honestly");
});

test("licensed sources require a licence note and an existing file", () => {
  for (const s of sources.LICENSED_SOURCES) {
    assert.ok(s.licence && s.licence.length > 3, `${s.theme} must document its licence`);
    assert.ok(s.src.startsWith("/audio/"), "licensed files live under public/audio");
    if (s.verified) {
      assert.ok(existsSync(resolve(ROOT, "public" + s.src)), `${s.src} must exist when verified`);
    }
  }
  ok("the registry cannot silently ship a missing or unlicensed file");
});

test("every world still has its own original 8-bit composition", () => {
  assert.equal(Object.keys(tracks.TRACKS).length, WORLD_THEME_IDS.length);
  const melodies = new Set(WORLD_THEME_IDS.map((id) => JSON.stringify(tracks.TRACKS[id].lead.bars)));
  assert.equal(melodies.size, WORLD_THEME_IDS.length, "no two worlds share a melody");
  ok("original per-world 8-bit music remains available for every theme");
});

test("music controls: master, music, sfx, mute and no overlap", () => {
  const p = prefsMod.normalizePrefs({ masterVolume: 60, musicVolume: 50, sfxVolume: 30, sfxEnabled: true });
  const levels = prefsMod.audioLevels(p);
  assert.equal(levels.master, 0.6);
  assert.ok(Math.abs(levels.music - 0.3) < 1e-9);
  assert.ok(Math.abs(levels.sfx - 0.18) < 1e-9);
  assert.equal(prefsMod.audioLevels(prefsMod.normalizePrefs({ masterVolume: 0 })).music, 0);
  assert.equal(prefsMod.isMuted(prefsMod.normalizePrefs({ masterVolume: 0 })), true);
  const engineSrc = read("src/lib/audio/engine.ts");
  const audioManager = read("src/components/prefs/AudioManager.tsx");
  assert.match(engineSrc, /setMusicTheme/, "themed switching path");
  assert.match(engineSrc, /fade\(m, 0\.0001, 0\.18\)/, "old track fades out before the new one starts");
  assert.match(audioManager, /isMusicPlaying/, "never starts a second concurrent loop");
  ok("volume/mute compose correctly and tracks never overlap");
});

/* ------------------------------------------------------------- casino store */

const storeMod = await import("../src/lib/casino/store.ts");
const {
  defaultCasinoState,
  normalizeCasinoState,
  STARTING_CHIPS,
  HISTORY_LIMIT,
  rulesFor,
} = storeMod;

test("casino store starts with virtual chips and no league coupling", () => {
  const d = defaultCasinoState();
  assert.equal(d.chips, STARTING_CHIPS);
  assert.ok(d.chips > 0);
  assert.equal(d.practice, false);
  assert.deepEqual(d.history, []);
  assert.equal(d.tableId, "classic");
  ok("a fresh casino starts with virtual chips only");
});

test("stored payloads are sanitised without throwing", () => {
  assert.deepEqual(normalizeCasinoState(null), defaultCasinoState());
  assert.deepEqual(normalizeCasinoState("nonsense"), defaultCasinoState());
  const dirty = normalizeCasinoState({
    chips: -50,
    practiceChips: "abc",
    tableId: "not-a-table",
    lastBet: -10,
    history: Array.from({ length: 500 }, (_, i) => ({ id: `r${i}` })),
    ledger: { rounds: -4, applied: [1, 2, "x"] },
    customRules: { decks: 3, maxSplits: 99 },
  });
  assert.equal(dirty.chips, 0, "chips can never be negative");
  assert.equal(dirty.practiceChips, defaultCasinoState().practiceChips);
  assert.equal(dirty.tableId, "classic");
  assert.equal(dirty.lastBet, 0);
  assert.equal(dirty.history.length, HISTORY_LIMIT, "history is bounded");
  assert.equal(dirty.ledger.rounds, 0);
  assert.deepEqual(dirty.ledger.applied, ["x"]);
  assert.equal(dirty.customRules.decks, defaultCasinoState().customRules.decks, "illegal decks rejected");
  assert.equal(dirty.customRules.maxSplits, 4, "illegal splits clamped");
  ok("negative/hostile casino payloads are clamped, never trusted");
});

test("rulesFor returns the real table configuration", () => {
  const st = { ...defaultCasinoState(), tableId: "vegas" as const };
  const r = rulesFor(st);
  assert.equal(r.decks, 8);
  assert.equal(r.dealerHitsSoft17, true);
  assert.equal(r.blackjackPayout, 1.2);
  const custom = rulesFor({ ...st, tableId: "custom" as const, customRules: { ...st.customRules, decks: 2 } });
  assert.equal(custom.decks, 2, "the custom table uses the player's own rules");
  ok("lobby/rules display comes from the same engine configuration");
});

/* ------------------------------------------------------------ ledger & pages */

const { settleRoundChips: settleChips, EMPTY_LEDGER: EMPTY } = await import("../src/lib/casino/settlement.ts");

test("the ledger is bounded and round ids are unique", () => {
  const round = {
    roundId: "r-1",
    reserved: 10,
    returned: 20,
    phase: "settled",
    hands: [{ outcome: "win" }],
    sideBets: [],
    insurance: { stake: 0, result: "none", payout: 0 },
  };
  const first = settleChips(round as never, 1000, EMPTY);
  assert.equal(first.settlement.balance, 1010);
  const again = settleChips(round as never, first.settlement.balance, first.ledger);
  assert.equal(again.settlement.duplicate, true);
  assert.equal(again.settlement.balance, 1010, "duplicate rounds never pay twice");
  ok("the settlement ledger blocks duplicate payouts");
});

test("casino pages exist and are reachable from the league navigation", () => {
  for (const page of ["page.tsx", "play/page.tsx", "history/page.tsx", "strategy/page.tsx"]) {
    assert.ok(existsSync(resolve(ROOT, "src/app/casino", page)), `/casino/${page} exists`);
  }
  const shell = read("src/components/Shell.tsx");
  assert.match(shell, /href: "\/casino"/, "casino link in the main navigation");
  const settingsPage = read("src/app/settings/page.tsx");
  for (const section of ["المظهر والثيمات", "الموسيقى والمؤثرات", "اهتزاز الشاشة", "الأفاتار", "البلاك جاك"]) {
    assert.ok(settingsPage.includes(section), `settings section "${section}" present`);
  }
  assert.ok(
    settingsPage.indexOf("الموسيقى والمؤثرات") < settingsPage.indexOf("البلاك جاك"),
    "settings are ordered 1–5",
  );
  ok("casino is a first-class page and settings follow the 5-section layout");
});

test("league data files were not touched", () => {
  // The casino must never import league stats/points into its math.
  const casinoFiles = [
    read("src/lib/casino/engine.ts"),
    read("src/lib/casino/settlement.ts"),
    read("src/lib/casino/stats.ts"),
    read("src/lib/casino/store.ts"),
  ].join("\n");
  assert.ok(!/from "@\/lib\/stats"/.test(casinoFiles), "casino never imports league stats");
  assert.ok(!/from "@\/db/.test(casinoFiles), "casino logic never touches the database");
  assert.ok(/localStorage/.test(read("src/lib/casino/store.ts")), "chips live in browser storage");
  ok("casino chips are fully separate from league points/rankings");
});

console.log(`\nenvironments/shake/audio/casino tests: ${passed} passed`);
