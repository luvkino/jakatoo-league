import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootUrl = new URL("file://" + ROOT + "/");

// Same resolver shim the existing tests use for extensionless .ts imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL;
    if (parent) {
      // "@/lib/x" -> <repo>/src/lib/x.ts (mirrors the tsconfig paths alias)
      if (specifier.startsWith("@/")) {
        const rel = new URL("src/" + specifier.slice(2), rootUrl);
        if (!/\.[cm]?[jt]sx?$/.test(rel.pathname) && existsSync(fileURLToPath(rel) + ".ts")) {
          return nextResolve(rel.href + ".ts", context);
        }
        if (existsSync(fileURLToPath(rel))) return nextResolve(rel.href, context);
      }
      // extensionless relative imports used by the app source
      if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        const candidate = new URL(specifier + ".ts", parent);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  AVATAR_OPTION_COUNTS,
  DEFAULT_AVATAR,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_STYLES,
  OUTFITS,
  ACCESSORIES,
  avatarsEqual,
  normalizeAvatar,
  randomAvatar,
} = await import("../src/lib/avatar.ts");
const {
  WORLD_THEMES,
  WORLD_THEME_IDS,
  SELECTABLE_WORLDS,
  isWorldTheme,
  normalizeWorldTheme,
  pickRandomWorld,
} = await import("../src/lib/worldThemes.ts");
const {
  DEFAULT_PREFS,
  audioLevels,
  isMuted,
  mergeServerPrefs,
  normalizePrefs,
  shakeActive,
  shakeAmplitude,
  shakeRotation,
  shakeDuration,
  bgActive,
  normalizeBgIntensity,
  toServerPrefs,
} = await import("../src/lib/prefs.ts");
const {
  computeRankMovements,
  formatDelta,
  pickFirstPlaceMessage,
  pickClimbMessage,
  pickFallMessage,
  pickLastPlaceMessage,
  CLIMB_MESSAGES,
  FALL_MESSAGES,
  FIRST_PLACE_MESSAGES,
  LAST_PLACE_MESSAGES,
} = await import("../src/lib/matchMessages.ts");
const { TRACKS, trackDuration, TRACK_THEMES } = await import("../src/lib/audio/tracks.ts");
const { noteToMidi, parseBar, parsePhrase, chordTones, parseDrumPattern } = await import(
  "../src/lib/audio/notation.ts"
);
const { musicBusGain, MUSIC_MAX_GAIN } = await import("../src/lib/audio/engine.ts");
const { computeLeague } = await import("../src/lib/stats.ts");

const ok = (name) => console.log(`  ✓ ${name}`);

/* ------------------------------------------------------------------ THEMES */
assert.equal(WORLD_THEME_IDS.length, 8); // classic + the 7 requested worlds
assert.equal(SELECTABLE_WORLDS.length, 7);
const required = ["cyberpunk", "ocean", "arcade", "mushroom", "vice", "balatro", "desert"];
for (const id of required) {
  assert.ok(WORLD_THEME_IDS.includes(id), `theme ${id} exists`);
  const meta = WORLD_THEMES.find((t) => t.id === id);
  assert.ok(meta, `${id} has metadata`);
  assert.equal(meta.swatch.length, 3);
  assert.ok(meta.label && meta.desc && meta.track && meta.bpm > 0);
}
ok("all seven worlds exist with original metadata + a soundtrack");

assert.equal(isWorldTheme("ocean"), true);
assert.equal(isWorldTheme("mario"), false);
assert.equal(normalizeWorldTheme("nope"), "classic");
assert.equal(normalizeWorldTheme(undefined), "classic");
ok("theme ids normalise safely for old payloads");

for (let seed = 0; seed < 60; seed++) {
  const a = pickRandomWorld(seed, "arcade");
  const b = pickRandomWorld(seed, "arcade");
  assert.equal(a, b, "random picker is deterministic");
  assert.notEqual(a, "arcade", "never returns the current theme");
  assert.notEqual(a, "classic", "random only proposes the seven worlds");
  assert.ok(SELECTABLE_WORLDS.includes(a));
}
ok("deterministic Random Theme that always changes the world");

/* ------------------------------------------------------------------ AVATAR */
assert.deepEqual(
  { ...AVATAR_OPTION_COUNTS },
  { skin: 11, hair: 8, hairColor: 8, eyes: 5, outfit: 8, accessory: 5 },
);
assert.equal(SKIN_TONES.length, 8 + 3, "8 natural + 3 fantasy skin tones");
assert.equal(HAIR_STYLES.length, 8);
assert.equal(HAIR_COLORS.length, 8);
assert.equal(EYE_STYLES.length, 5);
assert.equal(OUTFITS.length, 8);
assert.equal(ACCESSORIES.length, 5);
assert.equal(new Set(SKIN_TONES.map((s) => s.color)).size, 11, "all skin colours distinct");
ok("exactly the requested option counts, no bloat");

assert.deepEqual(normalizeAvatar(null), DEFAULT_AVATAR);
assert.deepEqual(normalizeAvatar("junk"), DEFAULT_AVATAR);
assert.deepEqual(
  normalizeAvatar({ skin: -1, hair: 99, hairColor: 2, eyes: 3, outfit: 8, accessory: 1 }),
  { skin: DEFAULT_AVATAR.skin, hair: DEFAULT_AVATAR.hair, hairColor: 2, eyes: 3, outfit: DEFAULT_AVATAR.outfit, accessory: 1 },
);
ok("avatar normalisation keeps valid fields and defaults invalid ones");

for (let seed = 1; seed < 40; seed++) {
  const avatar = randomAvatar(seed);
  assert.deepEqual(randomAvatar(seed), avatar, "randomAvatar is deterministic per seed");
  const n = normalizeAvatar(avatar);
  assert.deepEqual(n, avatar, "random avatars are always valid");
}
assert.equal(avatarsEqual(DEFAULT_AVATAR, { ...DEFAULT_AVATAR }), true);
assert.equal(avatarsEqual(DEFAULT_AVATAR, { ...DEFAULT_AVATAR, eyes: 1 }), false);
ok("Randomize produces valid, reproducible avatars");

/* ------------------------------------------------------------------- PREFS */
assert.equal(DEFAULT_PREFS.shakeIntensity, 15, "default shake intensity is 15%");
assert.equal(DEFAULT_PREFS.shakeEnabled, false, "screen shake is OFF by default");
assert.equal(DEFAULT_PREFS.bgAnimations, true, "living backgrounds are on by default");
assert.equal(DEFAULT_PREFS.bgIntensity, 2, "background intensity defaults to normal");
assert.equal(DEFAULT_PREFS.theme, "classic");
assert.deepEqual(normalizePrefs(null), { ...DEFAULT_PREFS });
const p = normalizePrefs({
  theme: "vice",
  masterVolume: 150,
  musicVolume: -4,
  sfxVolume: 55,
  shakeIntensity: 87.6,
  musicEnabled: false,
  sfxEnabled: true,
  shakeEnabled: false,
  matchAnimations: false,
  profilePlayerId: "11111111-1111-4111-8111-111111111111",
  avatar: { skin: 3 },
});
assert.equal(p.theme, "vice");
assert.equal(p.masterVolume, 100);
assert.equal(p.musicVolume, 0);
assert.equal(p.sfxVolume, 55);
assert.equal(p.shakeIntensity, 88);
assert.equal(p.musicEnabled, false);
assert.equal(p.shakeEnabled, false);
assert.equal(p.matchAnimations, false);
assert.equal(p.avatar.skin, 3);
assert.equal(normalizePrefs({ profilePlayerId: "not-a-uuid" }).profilePlayerId, null);
ok("preference normalisation clamps volumes/shake and validates ids");

// shake mapping: 0% is a complete OFF; low intensities stay genuinely subtle
assert.equal(shakeAmplitude(0), 0, "0% is absolutely no movement");
assert.ok(shakeAmplitude(10) > 0 && shakeAmplitude(10) < 0.5, "10% is barely perceptible");
assert.ok(shakeAmplitude(15) > shakeAmplitude(10) && shakeAmplitude(15) < 1);
assert.ok(shakeAmplitude(35) > 1 && shakeAmplitude(35) < 2.2, "35% ≈ Balatro nudge");
assert.ok(shakeAmplitude(100) <= 5, "max shake stays controlled (<=5px)");
assert.equal(shakeAmplitude(-50), 0);
assert.equal(shakeAmplitude(999), shakeAmplitude(100));
const shakeOn = { ...DEFAULT_PREFS, shakeEnabled: true };
assert.equal(shakeActive({ ...shakeOn, shakeIntensity: 0 }, false), false, "0% never shakes");
assert.equal(shakeActive({ ...shakeOn, shakeIntensity: 0 }, false), false);
assert.equal(shakeActive(DEFAULT_PREFS, false), false, "OFF by default");
assert.equal(shakeActive(shakeOn, true), false, "reduced motion always disables shake");
assert.equal(shakeActive(shakeOn, false), true);
assert.equal(shakeDuration(35) > 0, true);
assert.equal(shakeRotation(100) < shakeAmplitude(100), true);
ok("shake intensities 0/10/15/35/100 behave and honour reduced motion");

const levels = audioLevels(normalizePrefs({ masterVolume: 50, musicVolume: 40, sfxVolume: 80, sfxEnabled: true }));
assert.equal(levels.master, 0.5);
assert.ok(Math.abs(levels.music - 0.2) < 1e-9);
assert.ok(Math.abs(levels.sfx - 0.4) < 1e-9);
assert.equal(audioLevels(normalizePrefs({ masterVolume: 0 })).music, 0);
assert.equal(audioLevels(normalizePrefs({ musicEnabled: false })).music, 0);
assert.equal(audioLevels(normalizePrefs({ sfxEnabled: false })).sfx, 0);
assert.equal(isMuted(normalizePrefs({ masterVolume: 0 })), true);
assert.equal(bgActive(DEFAULT_PREFS, false), true);
assert.equal(bgActive({ ...DEFAULT_PREFS, bgAnimations: false }, false), false);
assert.equal(bgActive({ ...DEFAULT_PREFS, bgIntensity: 0 }, false), false);
assert.equal(bgActive(DEFAULT_PREFS, true), false, "reduced motion stops backgrounds too");
assert.equal(normalizeBgIntensity(9), 3);
assert.equal(normalizeBgIntensity(-4), 0);
assert.equal(normalizeBgIntensity("nope"), 2);
assert.equal(normalizePrefs({ bgIntensity: 3 }).bgIntensity, 3);
ok("volume sliders compose master × channel and mute correctly");

const server = toServerPrefs(normalizePrefs({ theme: "ocean", shakeIntensity: 10 }));
assert.equal(server.casinoSfxEnabled, true, "casino sound is a saved preference");
assert.equal(server.casinoTable, "classic", "selected casino table is a saved preference");
assert.equal(
  toServerPrefs(normalizePrefs({ casinoTable: "vegas" })).casinoTable,
  "vegas",
  "casino table round-trips through the server payload",
);
assert.equal(server.theme, "ocean");
assert.equal(Object.prototype.hasOwnProperty.call(server, "profilePlayerId"), false);
assert.equal(
  mergeServerPrefs(normalizePrefs({ profilePlayerId: "x" }), { theme: "not-a-world" }).theme,
  "classic",
  "invalid server themes fall back to classic",
);
const merged = mergeServerPrefs(
  normalizePrefs({ profilePlayerId: "11111111-1111-4111-8111-111111111111", avatar: { skin: 5 } }),
  { theme: "desert", shakeIntensity: 60 },
);
assert.equal(merged.theme, "desert");
assert.equal(merged.shakeIntensity, 60);
assert.equal(merged.avatar.skin, 5, "local avatar survives a server load");
ok("server payload excludes identity and merges without clobbering the avatar");

/* --------------------------------------------------------- RANK MOVEMENTS */
const prev = [
  { playerId: "a", rank: 1 },
  { playerId: "b", rank: 2 },
  { playerId: "c", rank: 3 },
  { playerId: "d", rank: 4 },
];
const next = [
  { playerId: "c", rank: 1 },
  { playerId: "a", rank: 2 },
  { playerId: "d", rank: 3 },
  { playerId: "b", rank: 4 },
];
const mv = computeRankMovements(prev, next);
assert.equal(mv.leaderChanged, true);
assert.equal(mv.previousLeaderId, "a");
assert.equal(mv.leader.playerId, "c");
assert.equal(mv.maxClimb, 2, "c jumped two positions");
assert.equal(mv.climbers[0].playerId, "c");
assert.equal(mv.climbers.find((x) => x.playerId === "d").delta, 1);
assert.equal(mv.maxFall, 2);
assert.equal(mv.fallers[0].playerId, "b");
assert.equal(mv.lastPlaceId, "b");
assert.equal(mv.rows.find((r) => r.playerId === "a").direction, "down");
ok("multi-position climbs/falls and leader changes are detected");

const noChange = computeRankMovements(prev, prev);
assert.equal(noChange.leaderChanged, false);
assert.equal(noChange.maxClimb, 0);
assert.equal(noChange.maxFall, 0);
assert.ok(noChange.rows.every((r) => r.direction === "same"));
ok("a match that does not change the ranking reports no movement");

const withNew = computeRankMovements(
  [{ playerId: "a", rank: 1 }],
  [
    { playerId: "z", rank: 1 },
    { playerId: "a", rank: 2 },
  ],
);
assert.equal(withNew.newEntry[0].playerId, "z");
assert.equal(withNew.rows.find((r) => r.playerId === "z").direction, "new");
ok("new entrants are flagged, never invented");

assert.equal(formatDelta(3), "▲ 3");
assert.equal(formatDelta(-2), "▼ 2");
assert.equal(formatDelta(0), "—");
for (const list of [FIRST_PLACE_MESSAGES, CLIMB_MESSAGES, LAST_PLACE_MESSAGES, FALL_MESSAGES]) {
  assert.ok(list.length >= 3, "each message pool has variety");
  assert.equal(new Set(list).size, list.length, "no duplicated messages");
}
assert.equal(pickFirstPlaceMessage(0), FIRST_PLACE_MESSAGES[0]);
assert.ok(FIRST_PLACE_MESSAGES.includes("الأسطورة وصل، البقية مجرد أرقام."));
assert.ok(FIRST_PLACE_MESSAGES.includes("المركز الأول محجوز."));
assert.ok(CLIMB_MESSAGES.includes("واضح أنه صحى من النوم."));
assert.ok(CLIMB_MESSAGES.includes("عودة تاريخية!"));
assert.ok(LAST_PLACE_MESSAGES.includes("مبروك، تم تعيينك مديرًا لحصالة الدوري."));
assert.ok(LAST_PLACE_MESSAGES.includes("هذا مو مركز مؤقت، هذا عنوان السكن."));
assert.ok(LAST_PLACE_MESSAGES.includes("الإدارة تتمنى لك موسمًا أفضل في 2040."));
assert.ok(FALL_MESSAGES.includes("البورصة انهارت، نعتذر للمساهمين."));
assert.ok(FALL_MESSAGES.includes("تراجع غير مبرر في الأسواق."));
ok("all requested Arabic messages are present");

/* --------------------------- RANK MOVEMENTS DRIVEN BY THE REAL ENGINE ----- */
{
  const players = ["أحمد", "سالم", "خالد", "فيصل"].map((name, i) => ({
    id: `p${i + 1}`,
    name,
    archived: false,
    createdAt: "2026-01-01T00:00:00Z",
  }));
  const mk = (id, t1, t2, w, stones) => ({
    id,
    seasonId: "s1",
    t1,
    t2,
    winningTeam: w,
    stones,
    comeback: false,
    note: null,
    playedAt: "2026-01-02T00:00:00Z",
  });
  const first = [mk("m1", ["p1", "p2"], ["p3", "p4"], 1, 5)];
  const second = [mk("m2", ["p3", "p4"], ["p1", "p2"], 1, 6), ...first];
  const before = computeLeague(players, first).ranking;
  const after = computeLeague(players, second).ranking;
  const summary = computeRankMovements(
    before.filter((r) => r.rank > 0).map((r) => ({ playerId: r.id, rank: r.rank })),
    after.filter((r) => r.rank > 0).map((r) => ({ playerId: r.id, rank: r.rank })),
  );
  // The animation must reflect exactly what the official engine produced.
  const expectedLeader = after.find((r) => r.rank === 1).id;
  assert.equal(summary.leader.playerId, expectedLeader);
  const climbs = summary.climbers.length;
  const falls = summary.fallers.length;
  assert.equal(climbs, falls, "every climb has a matching fall in a fixed-size league");
  assert.ok(summary.rows.length >= 4);
  // Nothing mutated the underlying stats: recomputing yields identical ranks.
  const again = computeLeague(players, second).ranking.map((r) => [r.id, r.rank, r.points]);
  const baseline = after.map((r) => [r.id, r.rank, r.points]);
  assert.deepEqual(again, baseline, "movement computation is read-only");
}
ok("movement summary matches the official ranking engine exactly");

/* ------------------------------------------------------------------- MUSIC */
assert.deepEqual([...TRACK_THEMES].sort(), [...WORLD_THEME_IDS].sort());
for (const id of WORLD_THEME_IDS) {
  const t = TRACKS[id];
  assert.ok(t.bpm >= 60 && t.bpm <= 180, `${id} tempo is musical`);
  assert.equal(t.lead.bars.length, t.bars, `${id} lead has one phrase per bar`);
  assert.equal(t.chords.length, t.bars, `${id} has a chord per bar`);
  if (t.harmony) assert.equal(t.harmony.bars.length, t.bars, `${id} harmony matches length`);
  assert.ok(t.bass.pattern.length === 16, `${id} bass pattern is 16 steps`);
  assert.ok(t.drums.kick.length === 16 && t.drums.snare.length === 16 && t.drums.hat.length === 16);
  assert.ok(t.lead.gain > 0 && t.lead.gain <= 0.2, `${id} lead level is comfortable`);
  assert.ok(t.bass.gain > 0 && t.bass.gain <= 0.25);
  assert.ok(trackDuration(id) > 10, `${id} loops for a meaningful duration`);
}
assert.notEqual(TRACKS.cyberpunk.bpm, TRACKS.ocean.bpm);
assert.notEqual(TRACKS.arcade.bpm, TRACKS.desert.bpm);
ok("every world ships a distinct original arrangement of 8 bars");

{
  const distinct = new Set(TRACK_THEMES.map((id) => JSON.stringify(TRACKS[id].lead.bars)));
  assert.equal(distinct.size, TRACK_THEMES.length, "no two worlds share a melody");
  const waves = new Set(TRACK_THEMES.flatMap((id) => [TRACKS[id].lead.wave, TRACKS[id].bass.wave]));
  assert.ok(waves.size >= 3, "layered waves variety");
}
ok("all seven soundtracks are musically distinct with layered waves");

assert.equal(noteToMidi("A4"), 69);
assert.equal(noteToMidi("C5"), 72);
assert.equal(noteToMidi("C#4"), 61);
assert.equal(noteToMidi("Bb3"), 58);
assert.equal(noteToMidi("nope"), null);
const bar = parseBar("C5:1 . E5:2 - G5:1");
assert.deepEqual(bar.map((n) => [n.step, n.midi, n.len]), [
  [0, 72, 1],
  [2, 76, 3],
  [5, 79, 1],
]);
assert.deepEqual(parseBar("garbage . ."), []);
assert.equal(parsePhrase(["C5:1", "D5:1"]).length, 2);
assert.equal(parsePhrase(["C5:1", "D5:1"])[1].step, 16);
assert.deepEqual(chordTones("Am"), [69, 72, 76]); // A4 root, minor third, fifth
assert.deepEqual(chordTones("C"), [60, 64, 67]);
assert.deepEqual(chordTones("G7"), [67, 71, 74, 77]); // major triad + minor 7th
ok("notation parser handles pitches, holds, rests and chords");

assert.deepEqual(parseDrumPattern("x...x...x...x..."), [0, 4, 8, 12]);
assert.deepEqual(parseDrumPattern(""), []);
ok("drum patterns parse to step indices");

assert.ok(musicBusGain(0.4) < MUSIC_MAX_GAIN);
assert.equal(musicBusGain(1), MUSIC_MAX_GAIN);
assert.ok(musicBusGain(0) <= 0.0001, "0 volume is effectively silent");
assert.ok(MUSIC_MAX_GAIN <= 0.4, "background music stays at a comfortable level");
ok("music bus gain respects volume and stays comfortable");

console.log("\nmultiverse, avatar, prefs, audio and match-animation tests passed");
