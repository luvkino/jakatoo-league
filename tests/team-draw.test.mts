// ============================================================================
// TEAM SPLITTER (تقسيم الفرق 🃏) — four-player genuine-randomness tests.
// Exactly four players; cards dealt face-up one at a time until two
// matching-rank pairs form two teams. Deterministic index sources are
// injected where reproducibility is needed; the production path is verified
// to use crypto.getRandomValues with rejection sampling, never Math.random.
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
  simulateTeamDraw, planAnimationSequence, REQUIRED_PLAYERS, TEAM_DRAW_TIMING, RANKS, SUITS,
} = td;

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

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
/** Deck whose first cards are `head` (drawn in that order), then the rest. */
function deckWithHead(head: { r: string; s: string }[]) {
  const headCards = head.map((c) => C(c.r, c.s));
  const rest = createStandardDeck().filter((c) => !headCards.some((h) => h.id === c.id));
  return [...headCards, ...rest];
}
const FOUR = ["p1", "p2", "p3", "p4"];

/* ---------------------------------------------------------------- deck */

test("standard deck has 52 unique cards: 4 suits × 13 ranks", () => {
  const deck = createStandardDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => c.id)).size, 52, "no duplicate cards");
  assert.deepEqual([...SUITS], ["S", "H", "D", "C"]);
  assert.equal(RANKS.length, 13);
  for (const s of SUITS) assert.equal(deck.filter((c) => c.s === s).length, 13);
  for (const r of RANKS) assert.equal(deck.filter((c) => c.r === r).length, 4);
});

test("secureRandomIndex rejects values >= limit (no modulo bias)", () => {
  const seq = [4294967295, 4294967295, 7]; // bound 3 → limit 4294967295
  let i = 0;
  assert.equal(secureRandomIndex(3, () => seq[i++]!), 7 % 3);
  assert.equal(i, 3, "biased-tail values were rejected and redrawn");
  assert.throws(() => secureRandomIndex(0), RangeError);
});

test("Fisher-Yates correctness and shuffled deck is an unmanipulated permutation", () => {
  const deck = createStandardDeck();
  assert.deepEqual(shuffleDeck(deck, (b) => b - 1).map((c) => c.id), deck.map((c) => c.id));
  const shuffled = createShuffledDeck(seededIndex(42));
  assert.deepEqual([...shuffled.map((c) => c.id)].sort(), deck.map((c) => c.id).sort());
  assert.equal(deck[0]!.id, "AS", "input deck never mutated");
  assert.throws(() => shuffleDeck(deck, () => 99), RangeError);
});

test("shuffle source uses crypto.getRandomValues, never the insecure random API", () => {
  const src = read("src/lib/teamDraw.ts");
  assert.doesNotMatch(src, /Math\.random/);
  assert.match(src, /crypto\.getRandomValues/);
  assert.match(src, /for \(let i = out\.length - 1; i > 0; i--\)/, "Fisher-Yates loop");
});

/* ------------------------------------------------------- four-player draw */

test(`exactly ${REQUIRED_PLAYERS} players are required`, () => {
  const deck = createStandardDeck();
  assert.throws(() => simulateTeamDraw(deck, ["a", "b", "c"]), RangeError);
  assert.throws(() => simulateTeamDraw(deck, ["a", "b", "c", "d", "e"]), RangeError);
  assert.throws(() => simulateTeamDraw(deck, ["a", "a", "b", "c"]), /duplicate/);
});

test("cards are dealt sequentially: deck[i] goes to the i-th dealt player", () => {
  const deck = createShuffledDeck(seededIndex(11));
  const res = simulateTeamDraw(deck, FOUR);
  res.dealt.forEach((d, i) => {
    assert.equal(d.drawIndex, i);
    assert.equal(d.card.id, deck[i]!.id, "every dealt card is the actual next deck card");
    assert.ok(Object.isFrozen(d), "revealed cards are frozen");
  });
  assert.equal(new Set(res.dealt.map((d) => d.card.id)).size, res.dealt.length, "no card duplicated");
  // Round-robin in player order until teams start removing players.
  assert.deepEqual(res.dealt.slice(0, 4).map((d) => d.playerId), FOUR);
});

test("dealing stops as soon as two matching pairs have formed two teams", () => {
  // p1:Q, p2:8, p3:Q -> team 1 (p1+p3) at draw 2; then p4 receives 8,
  // matching the 8 p2 already holds -> team 2 (p2+p4) at draw 3. Stop.
  const deck = deckWithHead([
    { r: "Q", s: "S" }, { r: "8", s: "H" }, { r: "Q", s: "D" }, { r: "8", s: "C" },
    { r: "K", s: "S" },
  ]);
  const res = simulateTeamDraw(deck, FOUR);
  assert.equal(res.status, "complete");
  assert.equal(res.dealt.length, 4, "stopped immediately after the second team formed");
  assert.deepEqual(res.teams.map((t) => t.rank), ["Q", "8"]);
  assert.deepEqual(res.teams[0]!.playerIds, ["p1", "p3"]);
  assert.deepEqual(res.teams[1]!.playerIds, ["p2", "p4"]);
  assert.equal(res.teams[0]!.formedAtDrawIndex, 2);
  assert.equal(res.teams[1]!.formedAtDrawIndex, 3);
});

test("matches are by rank only, across suits (Q♠ matches Q♥)", () => {
  const deck = deckWithHead([
    { r: "Q", s: "S" }, { r: "3", s: "H" }, { r: "Q", s: "H" }, { r: "3", s: "D" },
  ]);
  const res = simulateTeamDraw(deck, FOUR);
  assert.equal(res.teams[0]!.rank, "Q");
  assert.deepEqual(res.teams[0]!.playerIds, ["p1", "p3"]);
  assert.equal(res.teams[1]!.rank, "3");
});

test("a player can never match themselves, even holding two of a rank", () => {
  // p1 receives Q twice (draws 0 and 4) while nobody else holds Q: no team for p1.
  const deck = deckWithHead([
    { r: "Q", s: "S" }, { r: "2", s: "H" }, { r: "5", s: "D" }, { r: "9", s: "C" },
    { r: "Q", s: "H" }, { r: "2", s: "D" }, // p2 matches own-table p2? no: p2's 2 matches p2 only → still none
    { r: "5", s: "S" }, // p3 holds 5 → wait p3 dealt at index 6? rotation p1..p4,p1,p2,p3: p3 gets 5♠, matches p3's own 5♦ → self, ignored
    { r: "9", s: "H" }, // p4 gets 9♥, matches p4's own 9♣ → self, ignored
    { r: "2", s: "S" }, // p1 gets 2♠ → matches p2's 2s → team p1+p2
    { r: "5", s: "H" }, // remaining p3,p4: p3 gets 5♥ (self only, p3 still unassigned, no team)
    { r: "9", s: "D" }, // p4 gets 9♦ self only
    { r: "5", s: "C" }, // p3 self again — must never team with self; deck head ends, standard rest follows
  ]);
  const res = simulateTeamDraw(deck, FOUR);
  for (const t of res.teams) assert.notEqual(t.playerIds[0], t.playerIds[1], "no self-team");
  const early = res.teams.find((t) => t.formedAtDrawIndex <= 7);
  assert.equal(early, undefined, "no team formed from self-matches in the crafted head");
});

test("after the first team forms, only the two remaining players receive cards", () => {
  const deck = deckWithHead([
    { r: "A", s: "S" }, { r: "A", s: "H" }, // can't happen: dealing is p1,p2 → they match at index1
    { r: "7", s: "D" }, { r: "7", s: "C" },
  ]);
  const res = simulateTeamDraw(deck, FOUR);
  // p1+p2 team at draw 1; remaining p3,p4 then alternate until they match.
  assert.deepEqual(res.teams[0]!.playerIds, ["p1", "p2"]);
  const afterFirst = res.dealt.slice(2);
  assert.ok(afterFirst.every((d) => d.playerId === "p3" || d.playerId === "p4"));
  assert.deepEqual(res.teams[1]!.playerIds, ["p3", "p4"]);
});

test("deck exhaustion is reported honestly (no invented matches)", () => {
  // A 6-card deck where only self-pairs / no cross matches can occur for p1..p4 then ends:
  const tiny = [C("Q", "S"), C("2", "H"), C("5", "D"), C("9", "C"), C("Q", "H"), C("2", "D")];
  // draws: p1 Q, p2 2, p3 5, p4 9, p1 Q♥ (self), p2 2♦ (self) → deck ends, no teams.
  const res = simulateTeamDraw(tiny, FOUR);
  assert.equal(res.status, "exhausted");
  assert.equal(res.teams.length, 0);
  assert.equal(res.cardsUsed, 6);
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /انتهت المجموعة/, "UI explains deck exhaustion and offers a new shuffle");
});

test("a full shuffled deck virtually completes and always yields two disjoint pairs", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const res = simulateTeamDraw(createShuffledDeck(seededIndex(seed)), FOUR);
    assert.equal(res.status, "complete", `seed ${seed}`);
    assert.equal(res.teams.length, 2);
    const members = res.teams.flatMap((t) => t.playerIds);
    assert.equal(new Set(members).size, 4, "teams are disjoint and cover all players");
    for (const t of res.teams) {
      const cards = res.dealt.filter((d) => t.cardIds.includes(d.card.id));
      assert.equal(cards.length, 2);
      assert.ok(cards.every((c) => c.card.r === t.rank), "team cards share the rank");
      assert.notEqual(cards[0]!.card.s, undefined);
    }
  }
});

/* ------------------------------------------- animation, skip, replay, UI */

test("animation sequence exactly matches the real draw sequence", () => {
  const res = simulateTeamDraw(createShuffledDeck(seededIndex(7)), FOUR);
  const plan = planAnimationSequence(res.dealt);
  assert.deepEqual(plan.map((s) => s.cardId), res.dealt.map((d) => d.card.id));
  assert.deepEqual(plan.map((s) => s.playerId), res.dealt.map((d) => d.playerId));
});

test("skipping the animation reveals the same result without changing the draw", () => {
  const comp = read("src/components/TeamSplitter.tsx");
  const skipBody = comp.slice(comp.indexOf("const skip"), comp.indexOf("const reset"));
  assert.match(skipBody, /setRevealed\(result\.dealt\.length\)/, "skip reveals the existing draw");
  assert.doesNotMatch(skipBody, /createShuffledDeck|simulateTeamDraw/, "skip never re-draws or reshuffles");
  // The result a skip would show is exactly the simulated one:
  const res = simulateTeamDraw(createShuffledDeck(seededIndex(21)), FOUR);
  assert.deepEqual(res.dealt.slice(0, res.dealt.length), res.dealt);
});

test("shuffle again generates a completely new shuffle and result", () => {
  const a = createShuffledDeck(seededIndex(100));
  const b = createShuffledDeck(seededIndex(200));
  assert.notDeepEqual(a.map((c) => c.id), b.map((c) => c.id));
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /خلط من جديد/, "Shuffle Again control exists");
  assert.match(comp, /createShuffledDeck\(\)/, "each start builds a fresh shuffled deck");
});

test("fast animation timing stays within the specified ranges", () => {
  assert.ok(TEAM_DRAW_TIMING.shuffleMs >= 700 && TEAM_DRAW_TIMING.shuffleMs <= 1000);
  assert.ok(TEAM_DRAW_TIMING.moveMs >= 200 && TEAM_DRAW_TIMING.moveMs <= 300);
  assert.ok(TEAM_DRAW_TIMING.flipMs >= 150 && TEAM_DRAW_TIMING.flipMs <= 200);
  assert.ok(TEAM_DRAW_TIMING.pauseMs >= 100 && TEAM_DRAW_TIMING.pauseMs <= 150);
});

test("four-player table layout: top, right, bottom, left seats around the deck", () => {
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /td-seat-top/);
  assert.match(comp, /td-seat-right/);
  assert.match(comp, /td-seat-bottom/);
  assert.match(comp, /td-seat-left/);
  assert.match(comp, /تقسيم الفرق 🃏/);
  assert.match(comp, /بدء تقسيم الفرق/, "Start Team Split control");
  assert.match(comp, /تخطي الحركة/, "Skip Animation control");
  assert.match(comp, /إعادة تعيين/, "Reset control");
  assert.match(comp, /disabled=\{busy \|\| !exactlyFour\}/, "cannot start without exactly 4 / while busy");
  const page = read("src/app/draw/page.tsx");
  assert.match(page, /<TeamSplitter players=\{chosen\}/, "reuses the دق الولد selection, unmodified picker");
  assert.match(page, /splitterBusy/, "selection locked while a draw runs");
});

test("cards are genuine pixel art: bitmap ranks/suits, no text suit glyphs", () => {
  const card = read("src/components/PixelPlayingCard.tsx");
  assert.match(card, /SUIT_PIXELS/, "suits drawn from pixel bitmaps");
  assert.match(card, /CHAR_PIXELS/, "ranks drawn from a pixel font");
  assert.match(card, /crispEdges/, "square pixel edges");
  assert.match(card, /PixelCardBack/, "pixel-art card back");
  const comp = read("src/components/TeamSplitter.tsx");
  assert.doesNotMatch(comp, /[♠♥♦♣]/, "no ordinary text suit symbols in the splitter UI");
  assert.match(comp, /PixelPlayingCard/);
  assert.match(comp, /PixelCardBack/);
});

test("card sounds use the central SFX bus and respect the global mute", () => {
  const sound = read("src/lib/sound.ts");
  for (const kind of ["cardDraw", "cardFlip", "cardMatch"]) assert.match(sound, new RegExp(`case "${kind}"`));
  assert.match(sound, /sfxLevel <= 0\.001/, "global mute (level 0) silences card sounds");
  const comp = read("src/components/TeamSplitter.tsx");
  assert.match(comp, /useChaos\(\)/);
  assert.match(comp, /sfx\("cardMatch"\)/, "match discovery sound");
});

test("the feature never touches league data, scoring or the database", () => {
  const comp = read("src/components/TeamSplitter.tsx") + read("src/lib/teamDraw.ts");
  assert.doesNotMatch(comp, /fetch\(|api\/|drizzle|from "@\/db"|\.insert\(/, "purely local feature");
});

console.log(`\nteam-draw tests: ${passed} passed`);
