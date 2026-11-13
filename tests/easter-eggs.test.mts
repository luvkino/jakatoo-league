// Unit tests for the secret easter-egg pure logic (registry, code matching,
// blackjack engine, achievements, rare-event gating). No DOM needed.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Allow Node --experimental-strip-types to resolve extensionless relative .ts imports
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".mts") && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  EGGS,
  HUNTER_REQUIRED,
  matchCode,
  onePercentShouldRoll,
  pushKeyToBuffer,
  isTypingTarget,
} = await import("../src/components/easter/eggData.ts");
const bj = await import("../src/components/easter/blackjackEngine.ts");

let passed = 0;
const ok = (name: string) => {
  console.log(`  ✓ ${name}`);
  passed++;
};

// ---- secret registry ---------------------------------------------------------

assert.equal(EGGS.length, 11);
assert.ok(EGGS.every((e) => e.title && e.desc && e.hint && e.icon));
const codes = EGGS.filter((e) => e.code).map((e) => e.code!);
assert.equal(new Set(codes).size, codes.length, "codes must be unique");
ok("registry has 11 unique, fully-described eggs");

// ---- keystroke buffer + code matching ------------------------------------------

assert.equal(pushKeyToBuffer("", "b"), "b");
assert.equal(pushKeyToBuffer("black", "J"), "blackj");
assert.equal(pushKeyToBuffer("abc", "Shift"), "abc", "modifier keys do not clear the buffer");
assert.equal(pushKeyToBuffer("abc", " "), "abc ");
assert.ok(pushKeyToBuffer("x".repeat(60), "x").length <= 48, "buffer is bounded");
ok("pushKeyToBuffer: append, case-insensitive, separators, bounded");

assert.equal(matchCode("blackjack")?.id, "blackjack");
assert.equal(matchCode("BLACKJACK".toLowerCase())?.id, "blackjack");
assert.equal(matchCode("developer")?.id, "developer");
assert.equal(matchCode("glitch")?.id, "glitch");
assert.equal(matchCode("boss")?.id, "boss");
assert.equal(matchCode("alien")?.id, "alien");
assert.equal(matchCode("matrix")?.id, "matrix");
assert.equal(matchCode("pet")?.id, "pet");
assert.equal(matchCode("secrets")?.id, "secrets");
ok("every registered code matches when typed exactly");

assert.equal(matchCode("carpet"), null, "'pet' inside 'carpet' must not fire");
assert.equal(matchCode("embossed"), null, "'boss' inside 'embossed' must not fire");
assert.equal(matchCode("xxpet"), null, "'pet' glued to a word does not fire");
assert.equal(matchCode("xxboss"), null, "'boss' glued to a word does not fire");
assert.equal(matchCode("my blackjack")?.id, "blackjack", "word boundary allows the code after a space");
assert.equal(matchCode("my pet")?.id, "pet", "short code after a separator fires");
assert.equal(matchCode("plzblackjack")?.id, "blackjack", "long codes match as a suffix (mistype + quick retype)");
assert.equal(matchCode("oopsdeveloper")?.id, "developer");
assert.equal(matchCode(""), null);
ok("matching prevents accidental activation but forgives quick retypes");

assert.equal(isTypingTarget(null), false);
ok("isTypingTarget handles null targets");

// ---- rare event gating ----------------------------------------------------------

assert.equal(
  onePercentShouldRoll({ sessionSeen: true, lastTriggeredAtMs: null, nowMs: 1000 }),
  false,
  "already seen this session",
);
assert.equal(
  onePercentShouldRoll({ sessionSeen: false, lastTriggeredAtMs: 999_999, nowMs: 1_000_000 }),
  false,
  "inside cooldown",
);
assert.equal(
  onePercentShouldRoll({ sessionSeen: false, lastTriggeredAtMs: 999_999, nowMs: 999_999 + 7 * 60 * 60 * 1000 }),
  true,
  "after cooldown",
);
assert.equal(onePercentShouldRoll({ sessionSeen: false, lastTriggeredAtMs: null, nowMs: 5 }), true);
ok("1% event: session guard + cooldown logic");

// ---- blackjack engine -------------------------------------------------------------

const deck = bj.freshDeck();
assert.equal(deck.length, 52);
assert.equal(new Set(deck.map((c) => `${c.r}${c.s}`)).size, 52, "52 unique cards");
ok("fresh deck is a standard 52-card deck");

const shuffled = bj.shuffleDeck(deck);
assert.equal(shuffled.length, 52);
assert.equal(new Set(shuffled.map((c) => `${c.r}${c.s}`)).size, 52, "shuffle keeps the same cards");
const key = (cs: bj.Card[]) => cs.map((c) => `${c.r}${c.s}`).sort();
assert.deepEqual(key(shuffled), key(deck), "same multiset of ranks/suits after shuffle");
assert.notEqual(deck, shuffled, "shuffle returns a copy");
assert.ok(shuffled.every((c, i) => c.id.includes(`#${i}`)), "shuffle re-ids for stable React keys");
ok("Fisher-Yates shuffle preserves the multiset and copies");

const C = (r: bj.Rank, s: bj.Suit): bj.Card => ({ r, s, id: `${r}${s}` });
assert.equal(bj.handValue([C("A", "S"), C("K", "H")]).total, 21);
assert.equal(bj.handValue([C("A", "S"), C("K", "H")]).soft, true);
assert.equal(bj.handValue([C("A", "S"), C("A", "H"), C("9", "C")]).total, 21);
assert.equal(bj.handValue([C("A", "S"), C("A", "H"), C("9", "C")]).soft, true, "A,A,9 is soft 21");
assert.equal(bj.handValue([C("A", "S"), C("A", "H"), C("9", "C"), C("9", "D")]).total, 20);
assert.equal(bj.handValue([C("A", "S"), C("A", "H"), C("9", "C"), C("9", "D")]).soft, false);
assert.equal(bj.handValue([C("K", "S"), C("Q", "H"), C("J", "C")]).total, 30);
assert.equal(bj.handValue([C("A", "S"), C("5", "H"), C("10", "C")]).total, 16);
assert.equal(bj.handValue([C("7", "S"), C("7", "H")]).total, 14);
ok("hand scoring: naturals, soft aces, ace reduction, busts");

assert.equal(bj.isNatural([C("A", "S"), C("K", "H")]), true);
assert.equal(bj.isNatural([C("10", "S"), C("A", "H")]), true);
assert.equal(bj.isNatural([C("A", "S"), C("K", "H"), C("Q", "C")]), false);
assert.equal(bj.isNatural([C("9", "S"), C("K", "H")]), false);
ok("natural blackjack detection");

assert.equal(bj.dealerShouldHit([C("10", "S"), C("6", "H")]), true);
assert.equal(bj.dealerShouldHit([C("10", "S"), C("7", "H")]), false);
assert.equal(bj.dealerShouldHit([C("A", "S"), C("6", "H")]), false, "dealer stands on soft 17");
ok("dealer draws until 17+ and stands on soft 17");

assert.equal(bj.resolveRound([C("A", "S"), C("K", "H")], [C("9", "S"), C("9", "H")]), "natural");
assert.equal(bj.resolveRound([C("A", "S"), C("K", "H")], [C("A", "H"), C("Q", "C")]), "push");
assert.equal(bj.resolveRound([C("K", "S"), C("9", "H")], [C("K", "H"), C("8", "C")]), "win");
assert.equal(bj.resolveRound([C("K", "S"), C("8", "H")], [C("K", "H"), C("9", "C")]), "lose");
assert.equal(bj.resolveRound([C("K", "S"), C("Q", "H"), C("5", "C")], [C("9", "S"), C("9", "H")]), "player_bust");
assert.equal(bj.resolveRound([C("K", "S"), C("7", "H")], [C("K", "H"), C("8", "C"), C("9", "S")]), "dealer_bust");
ok("round resolution: naturals, wins, losses, pushes, busts");

assert.equal(bj.payoutMultiplier("natural"), 1.5);
assert.equal(bj.payoutMultiplier("win"), 1);
assert.equal(bj.payoutMultiplier("dealer_bust"), 1);
assert.equal(bj.payoutMultiplier("push"), 0);
assert.equal(bj.payoutMultiplier("lose"), -1);
assert.equal(bj.payoutMultiplier("player_bust"), -1);
ok("payout multipliers (natural 3:2)");

let stats = bj.newBlackjackStats();
assert.equal(stats.chips, bj.STARTING_CHIPS);
stats = bj.applyRound(stats, 100, "win");
assert.equal(stats.chips, 1100);
assert.equal(stats.rounds, 1);
assert.equal(stats.wins, 1);
stats = bj.applyRound(stats, 100, "natural");
assert.equal(stats.chips, 1250);
stats = bj.applyRound(stats, 100, "push");
assert.equal(stats.chips, 1250);
stats = bj.applyRound(stats, 100, "lose");
assert.equal(stats.chips, 1150);
assert.equal(stats.streak, 0);
stats = bj.applyRound(stats, 100, "player_bust");
assert.equal(stats.chips, 1050);
ok("stats reducer: chips arithmetic and counters");

let s2 = bj.newBlackjackStats();
for (let i = 0; i < 5; i++) s2 = bj.applyRound(s2, 10, "win");
assert.equal(s2.streak, 5);
assert.equal(s2.bestStreak, 5);
s2 = bj.applyRound(s2, 10, "lose");
assert.equal(s2.streak, 0);
assert.equal(s2.bestStreak, 5);
ok("win streak tracking with best-streak memory");

// ---- secret achievements from a round ----------------------------------------------

const fresh = bj.newBlackjackStats();
assert.deepEqual(bj.roundAchievements("win", [C("10", "S"), C("9", "H")], fresh), ["first_blackjack"]);
assert.deepEqual(
  bj.roundAchievements("win", [C("5", "S"), C("7", "H"), C("9", "C")], { ...fresh, rounds: 3 }),
  ["lucky_21"],
);
assert.deepEqual(
  bj.roundAchievements("dealer_bust", [C("10", "S"), C("9", "H")], { ...fresh, rounds: 3 }),
  ["dealer_destroyer"],
);
const almost = { ...fresh, rounds: 9, streak: 4 };
assert.deepEqual(bj.roundAchievements("win", [C("10", "S"), C("9", "H")], almost), ["streak_5"]);
const already = { ...fresh, rounds: 9, streak: 9 };
assert.deepEqual(bj.roundAchievements("win", [C("10", "S"), C("9", "H")], already), []);
ok("round achievements: first round, lucky 21, dealer destroyer, 5-streak");

// ---- hunter requirement -------------------------------------------------------------

assert.ok(HUNTER_REQUIRED.length >= 9);
assert.ok(!HUNTER_REQUIRED.includes("onepercent"), "the pure-luck 1% event is excluded");
ok("secret hunter excludes the pure-luck event");

console.log(`\neaster-eggs: ${passed} checks passed`);
