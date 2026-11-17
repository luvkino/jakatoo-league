// ============================================================================
// TEAM SPLITTER (تقسيم الفرق 🃏) — genuine-randomness and fairness tests.
// The distribution logic is pure; deterministic index sources are injected
// where reproducibility is needed, while the production path is verified
// (structurally + statistically) to use crypto.getRandomValues with
// rejection sampling and never Math.random.
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
    return nextResolve(specifier, context);
  },
});

const td = await import("../src/lib/teamDraw.ts");
const {
  createStandardDeck, createShuffledDeck, shuffleDeck, secureRandomIndex,
  dealDistribution, planAnimationSequence, groupByRank, evaluateTwoTeams,
  MIN_PLAYERS, MAX_PLAYERS, TEAM_DRAW_TIMING, RANKS, SUITS,
} = td;

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/** Deterministic uint32 source (mulberry-ish) for reproducible tests only. */
function seededUint32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const seededIndex = (seed: number) => {
  const next = seededUint32(seed);
  return (bound: number) => secureRandomIndex(bound, next);
};
const C = (r: string, s = "S") => ({ r, s, id: `${r}${s}` });

/* ---------------------------------------------------------------- deck */

test("standard deck has 52 unique cards: 4 suits × 13 ranks", () => {
  const deck = createStandardDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => c.id)).size, 52, "no duplicate cards");
  assert.deepEqual([...SUITS], ["S", "H", "D", "C"]);
  assert.equal(RANKS.length, 13);
  for (const s of SUITS) assert.equal(deck.filter((c) => c.s === s).length, 13, `suit ${s}`);
  for (const r of RANKS) assert.equal(deck.filter((c) => c.r === r).length, 4, `rank ${r}`);
});

test("secureRandomIndex rejects values >= limit (no modulo bias)", () => {
  // bound 3: limit = floor(2^32/3)*3 = 4294967295, so 4294967295 must be rejected.
  const seq = [4294967295, 4294967295, 7];
  let i = 0;
  const j = secureRandomIndex(3, () => seq[i++]!);
  assert.equal(i, 3, "two biased-tail values were rejected");
  assert.equal(j, 7 % 3);
  assert.equal(secureRandomIndex(1, () => { throw new Error("must not draw"); }), 0);
  assert.throws(() => secureRandomIndex(0), RangeError);
  assert.throws(() => secureRandomIndex(2.5), RangeError);
});

test("secureRandomIndex stays in range and covers every residue", () => {
  const next = seededUint32(1234);
  const seen = new Set<number>();
  for (let n = 0; n < 4000; n++) {
    const j = secureRandomIndex(7, next);
    assert.ok(j >= 0 && j < 7);
    seen.add(j);
  }
  assert.equal(seen.size, 7);
});

test("Fisher-Yates: identity indices keep order, zero indices rotate predictably", () => {
  const deck = createStandardDeck();
  const identity = shuffleDeck(deck, (bound) => bound - 1); // j = i every time
  assert.deepEqual(identity.map((c) => c.id), deck.map((c) => c.id));
  const zeroed = shuffleDeck(deck.slice(0, 4), () => 0);
  assert.deepEqual(zeroed.map((c) => c.id), [deck[1]!.id, deck[2]!.id, deck[3]!.id, deck[0]!.id]);
  assert.deepEqual(deck[0]!.id, "AS", "input deck was not mutated");
  assert.equal(shuffleDeck(deck, seededIndex(9)).length, 52);
  assert.throws(() => shuffleDeck(deck, () => 99), RangeError, "out-of-range index rejected");
});

test("shuffled deck is a permutation of the standard deck (secure default path)", () => {
  const shuffled = createShuffledDeck();
  assert.equal(shuffled.length, 52);
  assert.deepEqual(
    shuffled.map((c) => c.id).sort(),
    createStandardDeck().map((c) => c.id).sort(),
  );
  const again = createShuffledDeck();
  assert.notDeepEqual(again.map((c) => c.id), shuffled.map((c) => c.id), "two real shuffles differ");
});

test("shuffle source never uses Math.random and uses crypto.getRandomValues", () => {
  const src = read("src/lib/teamDraw.ts");
  assert.doesNotMatch(src, /Math\.random/, "no Math.random in the draw module");
  assert.match(src, /crypto\.getRandomValues/);
  assert.match(src, /for \(let i = out\.length - 1; i > 0; i--\)/, "Fisher-Yates loop");
});

/* ----------------------------------------------------------- distribution */

test("distribution deals deck[0..n) sequentially, one card per player, in order", () => {
  const deck = createShuffledDeck(seededIndex(42));
  const players = ["p1", "p2", "p3", "p4"];
  const dealt = dealDistribution(deck, players);
  assert.equal(dealt.length, 4);
  dealt.forEach((d, i) => {
    assert.equal(d.drawIndex, i);
    assert.equal(d.playerId, players[i]);
    assert.equal(d.card.id, deck[i]!.id, "card comes from the actual shuffled deck");
  });
  assert.equal(new Set(dealt.map((d) => d.card.id)).size, 4, "no card dealt twice");
});

test("animation sequence exactly matches the real draw sequence", () => {
  const deck = createShuffledDeck(seededIndex(7));
  const dealt = dealDistribution(deck, ["a", "b", "c", "d", "e"]);
  const plan = planAnimationSequence(dealt);
  assert.deepEqual(plan.map((s) => s.cardId), dealt.map((d) => d.card.id));
  assert.deepEqual(plan.map((s) => s.playerId), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(plan.map((s) => s.stepIndex), [0, 1, 2, 3, 4]);
});

test("dealt cards are frozen: a revealed card can never change", () => {
  const dealt = dealDistribution(createShuffledDeck(seededIndex(3)), ["a", "b"]);
  for (const d of dealt) assert.ok(Object.isFrozen(d));
  const before = dealt.map((d) => d.card.id);
  groupByRank(dealt);
  evaluateTwoTeams(dealt);
  assert.deepEqual(dealt.map((d) => d.card.id), before, "grouping/evaluating mutates nothing");
});

test("replay generates a completely new shuffle and a new result", () => {
  const first = createShuffledDeck(seededIndex(100));
  const second = createShuffledDeck(seededIndex(200));
  assert.notDeepEqual(second.map((c) => c.id), first.map((c) => c.id));
  const d1 = dealDistribution(first, ["a", "b", "c", "d"]).map((d) => d.card.id);
  const d2 = dealDistribution(second, ["a", "b", "c", "d"]).map((d) => d.card.id);
  assert.notDeepEqual(d2, d1);
  // Production replay path (component) calls createShuffledDeck() afresh.
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /createShuffledDeck\(\)/, "shuffle creates a fresh deck");
  assert.match(comp, /إعادة التوزيع \(خلط جديد\)/, "replay button exists");
});

test("reset clears the distribution (component state + no stale deck)", () => {
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /const reset = useCallback/);
  assert.match(comp, /deckRef\.current = null/);
  assert.match(comp, /setDealt\(\[\]\)/);
  assert.match(comp, /setPhase\("idle"\)/);
});

/* ----------------------------------------------------------------- teams */

test("matching ranks form teams (spec example: Q,8,Q,8 → two teams)", () => {
  const dealt = [
    { drawIndex: 0, playerId: "A", card: C("Q", "S") },
    { drawIndex: 1, playerId: "B", card: C("8", "H") },
    { drawIndex: 2, playerId: "C", card: C("Q", "D") },
    { drawIndex: 3, playerId: "D", card: C("8", "C") },
  ];
  const ev = evaluateTwoTeams(dealt);
  assert.equal(ev.status, "two-teams");
  assert.equal(ev.formsTwoTeams, true);
  assert.deepEqual(ev.teams.map((t) => t.rank), ["Q", "8"]);
  assert.deepEqual(ev.teams[0]!.members.map((m) => m.playerId), ["A", "C"]);
  assert.deepEqual(ev.teams[1]!.members.map((m) => m.playerId), ["B", "D"]);
  assert.equal(ev.unmatched.length, 0);
});

test("a rank appearing 3+ times puts all of them on the same team", () => {
  const dealt = [
    { drawIndex: 0, playerId: "A", card: C("K", "S") },
    { drawIndex: 1, playerId: "B", card: C("K", "H") },
    { drawIndex: 2, playerId: "C", card: C("K", "D") },
    { drawIndex: 3, playerId: "D", card: C("5", "C") },
  ];
  const ev = evaluateTwoTeams(dealt);
  assert.equal(ev.teams.length, 1);
  assert.deepEqual(ev.teams[0]!.members.map((m) => m.playerId), ["A", "B", "C"]);
  assert.equal(ev.status, "partial-matches", "honestly reported, never 'fixed'");
  assert.equal(ev.formsTwoTeams, false);
});

test("no matches and odd counts are reported, never silently corrected", () => {
  const dealt = dealDistribution(
    [C("A", "S"), C("3", "H"), C("7", "D"), C("9", "C"), C("J", "S")],
    ["a", "b", "c", "d", "e"],
  );
  const ev = evaluateTwoTeams(dealt);
  assert.equal(ev.status, "no-matches");
  assert.equal(ev.equalSplitPossible, false, "odd count cannot split equally");
  assert.equal(ev.unmatched.length, 5);
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /عدد اللاعبين فردي/, "odd-count limitation explained in UI");
  assert.match(comp, /لم يتشكّل فريقان فقط/, "non-two-team outcome explained in UI");
});

test(`player counts outside ${MIN_PLAYERS}–${MAX_PLAYERS} are rejected`, () => {
  const deck = createStandardDeck();
  assert.throws(() => dealDistribution(deck, ["only"]), RangeError);
  assert.throws(() => dealDistribution(deck, Array.from({ length: 13 }, (_, i) => `p${i}`)), RangeError);
  assert.throws(() => dealDistribution(deck, ["a", "a"]), /duplicate/);
  assert.equal(dealDistribution(deck, ["a", "b"]).length, MIN_PLAYERS);
  assert.equal(
    dealDistribution(deck, Array.from({ length: 12 }, (_, i) => `p${i}`)).length,
    MAX_PLAYERS,
  );
});

/* ------------------------------------------- animation, timing and sounds */

test("animation timing stays within the specified ranges", () => {
  assert.ok(TEAM_DRAW_TIMING.shuffleMs >= 1500 && TEAM_DRAW_TIMING.shuffleMs <= 2500);
  assert.ok(TEAM_DRAW_TIMING.moveMs >= 400 && TEAM_DRAW_TIMING.moveMs <= 700);
  assert.ok(TEAM_DRAW_TIMING.flipMs >= 250 && TEAM_DRAW_TIMING.flipMs <= 400);
  assert.ok(TEAM_DRAW_TIMING.pauseMs >= 350 && TEAM_DRAW_TIMING.pauseMs <= 600);
});

test("component deals face-up one card at a time and locks input while busy", () => {
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /planAnimationSequence\(distribution\)/, "animation follows the draw plan");
  assert.match(comp, /setRevealed\(index \+ 1\)/, "cards land/reveal sequentially");
  assert.match(comp, /disabled=\{busy \|\| phase !== "shuffled"\}/, "no duplicate starts");
  assert.match(comp, /td-flying/, "a card physically travels from the deck");
  assert.match(comp, /تقسيم الفرق 🃏/, "feature title present");
  const page = read("src/app/draw/page.tsx");
  assert.match(page, /splitterBusy/, "player selection locked during distribution");
  assert.match(page, /<TeamSplitter players=\{chosen\}/, "reuses existing player selection");
  assert.ok(page.indexOf("<TeamSplitter") > page.indexOf("اللاعبون المشاركون"), "below the lottery section");
});

test("card sounds use the central SFX bus and respect the global mute", () => {
  const sound = read("src/lib/sound.ts");
  for (const kind of ["cardShuffle", "cardDraw", "cardLand", "cardFlip", "cardMatch", "teamReveal"]) {
    assert.match(sound, new RegExp(`case "${kind}"`), `${kind} implemented`);
  }
  assert.match(sound, /sfxLevel <= 0\.001/, "muted/zero level silences card sounds");
  assert.match(sound, /CARD_SFX_MIN_GAP_MS/, "card sounds cannot overlap themselves");
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /useChaos\(\)/, "sounds go through the existing audio system");
  assert.match(comp, /sfx\("cardShuffle"\)/);
  assert.match(comp, /sfx\("teamReveal"\)/);
  const manager = read("src/components/prefs/AudioManager.tsx");
  assert.match(manager, /setSfxLevel\(muted \|\| !prefs\.sfxEnabled \? 0/, "global mute zeroes the SFX bus");
});

console.log(`\nteam-draw tests: ${passed} passed`);
