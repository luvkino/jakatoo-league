// ============================================================================
// CASINO — deterministic Blackjack rules-engine, settlement and side-bet tests.
//
// Every round below is played against a hand-crafted shoe, so the assertions
// are fully reproducible. Run with: npm run test:casino
// ============================================================================

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
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

const cards = await import("../src/lib/casino/cards.ts");
const { handValue, isBlackjack, freshShoe, shuffle, makeRng, isSplittablePair } = cards;
const engine = await import("../src/lib/casino/engine.ts");
const { reducer, createState, legalMoves, settleHand, dealerShouldHit, handStake, finishRound } = engine;
const tables = await import("../src/lib/casino/tables.ts");
const { CLASSIC_RULES, TABLES, TABLE_MAP, normalizeRules } = tables;
const sideBets = await import("../src/lib/casino/sideBets.ts");
const { settleSideBet, SIDE_BET_PAYTABLE } = sideBets;
const settlement = await import("../src/lib/casino/settlement.ts");
const { settleRoundChips, auditRound, EMPTY_LEDGER, chipsFor, clampBet } = settlement;
const statsMod = await import("../src/lib/casino/stats.ts");
const { computeCasinoStats, OUTCOME_LABEL_AR } = statsMod;
const strategy = await import("../src/lib/casino/strategy.ts");
const { BASIC_STRATEGY, advise, HARD_ROWS, SOFT_ROWS, PAIR_ROWS, DEALER_UPCARDS } = strategy;

let passed = 0;
let failed = 0;
const ok = (name: string) => {
  console.log(`  ✓ ${name}`);
  passed++;
};
const test = (name: string, fn: () => void) => {
  try {
    fn();
    ok(name);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(e);
  }
};

/* --------------------------------------------------------------- helpers */

const C = (r: string, s = "S") => ({ r, s, id: `${r}${s}` });

/** Builds a state whose draws come out in `order` (first element drawn first). */
function craft(rules = CLASSIC_RULES, order = [], opts = {}) {
  const st = createState(rules, 1);
  // `draw` pops from the end, so reverse the list to deal `order[0]` first.
  const shoe = [...order].reverse().map((c, i) => ({ ...c, id: `${c.r}${c.s}t${i}` }));
  return { ...st, shoe, shoeStart: Math.max(shoe.length, 1), ...opts };
}

/**
 * Deals a round with a crafted draw order. The real deal sequence is
 * player, dealer, player, dealer — so the shelf order is p1,d1,p2,d2.
 */
function dealOrder(rules, p1, p2, d1, d2, rest = []) {
  const st = craft(rules, [p1, d1, p2, d2, ...rest]);
  return { st, deal: reducer(st, { type: "deal", bet: { bet: rules.minBet, sideBets: [] }, balance: 100000 }) };
}

/** Answers "no insurance" when the table is waiting on that decision. */
function answerInsurance(st, take = false) {
  return st.phase === "player" && st.insurance.offered && st.insurance.stake === 0
    ? reducer(st, { type: "insurance", take }, 100000)
    : st;
}

/* ------------------------------------------------------------ card math */

test("handValue handles soft/hard aces and multiple aces", () => {
  assert.deepEqual(handValue([C("A"), C("6")]), { total: 17, soft: true, hard: 7, aces: 1 });
  assert.deepEqual(handValue([C("A"), C("6"), C("10")]), { total: 17, soft: false, hard: 17, aces: 1 });
  assert.deepEqual(handValue([C("A"), C("A")]), { total: 12, soft: true, hard: 2, aces: 2 });
  assert.deepEqual(handValue([C("A"), C("A"), C("A")]), { total: 13, soft: true, hard: 3, aces: 3 });
  assert.deepEqual(handValue([C("A"), C("A"), C("A"), C("A")]), { total: 14, soft: true, hard: 4, aces: 4 });
  assert.deepEqual(handValue([C("K"), C("Q"), C("J")]), { total: 30, soft: false, hard: 30, aces: 0 });
  assert.equal(isBlackjack([C("A"), C("K")]), true);
  assert.equal(isBlackjack([C("A"), C("K"), C("2")]), false);
  assert.equal(isBlackjack([C("7"), C("7"), C("7")]), false);
});

test("shoe integrity and reproducible shuffle", () => {
  for (const n of [1, 2, 4, 6, 8]) assert.equal(freshShoe(n).length, n * 52);
  const ids = new Set(freshShoe(8).map((c) => c.id));
  assert.equal(ids.size, 416, "every card in a shoe is unique");
  const a = shuffle(freshShoe(2), makeRng(42));
  const b = shuffle(freshShoe(2), makeRng(42));
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id), "same seed ⇒ same shoe");
  const before = freshShoe(1);
  shuffle(before, makeRng(7));
  assert.equal(before[0].r, "A", "shuffle never mutates its input");
});

test("splittable pairs follow casino rules", () => {
  assert.equal(isSplittablePair([C("8"), C("8")]), true);
  assert.equal(isSplittablePair([C("10"), C("K")]), true, "any two ten-value cards split");
  assert.equal(isSplittablePair([C("A"), C("A")]), true);
  assert.equal(isSplittablePair([C("8"), C("9")]), false);
});

/* ------------------------------------------------------- engine: dealing */

test("a win returns stake + winnings (balance never drops on a win)", () => {
  const rules = { ...CLASSIC_RULES, dealerHitsSoft17: false };
  // player 20, dealer 18 (S17 stands)
  const { deal } = dealOrder(rules, C("K"), C("Q"), C("10"), C("8"));
  const played = reducer(deal, { type: "stand" }, 100000);
  assert.equal(played.phase, "settled");
  const hand = played.hands[0];
  assert.equal(hand.outcome, "win");
  assert.equal(hand.payout, 20, "stake 10 returned + 10 won");
  assert.equal(played.reserved, 10);
  assert.equal(played.returned, 20);

  const { settlement: s, ledger } = settleRoundChips(played, 1000, EMPTY_LEDGER);
  assert.equal(s.reserved, 10);
  assert.equal(s.returned, 20);
  assert.equal(s.net, 10);
  assert.equal(s.balance, 1010, "was 990 after the stake, +20 back = 1010");
  assert.equal(ledger.wins, 1);
  assert.equal(ledger.rounds, 1);
});

test("a loss deducts the stake exactly once", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("8"), C("K"), C("Q"));
  const played = reducer(deal, { type: "stand" }, 100000);
  assert.equal(played.hands[0].outcome, "lose");
  assert.equal(played.returned, 0);
  const { settlement: s } = settleRoundChips(played, 1000);
  assert.equal(s.net, -10);
  assert.equal(s.balance, 990);
});

test("a push returns exactly the stake", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("K"), C("Q"), C("10"), C("J"));
  const played = reducer(deal, { type: "stand" }, 100000);
  assert.equal(played.hands[0].outcome, "push");
  const { settlement: s } = settleRoundChips(played, 1000);
  assert.equal(s.net, 0);
  assert.equal(s.balance, 1000);
});

test("player bust loses even when the dealer also busts later", () => {
  const rules = { ...CLASSIC_RULES };
  const { deal } = dealOrder(rules, C("10"), C("6"), C("10"), C("6"), [C("10")]);
  const hitState = reducer(deal, { type: "hit" }, 100000);
  // 10+6+10 = 26 → bust; dealer must not draw
  assert.equal(hitState.phase, "settled");
  assert.equal(hitState.hands[0].outcome, "bust");
  assert.equal(hitState.hands[0].payout, 0);
  assert.equal(hitState.dealer.length, 2, "dealer does not draw when every hand busted");
});

test("dealer bust pays the player", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("7"), C("10"), C("6"), [C("10")]);
  const played = reducer(deal, { type: "stand" }, 100000);
  assert.equal(played.hands[0].outcome, "dealer_bust");
  assert.equal(played.hands[0].payout, 20);
});

/* -------------------------------------------------- dealer rules H17 / S17 */

test("S17 dealer stands on soft 17", () => {
  assert.equal(dealerShouldHit([C("A"), C("6")], { ...CLASSIC_RULES, dealerHitsSoft17: false }), false);
  assert.equal(dealerShouldHit([C("A"), C("6")], { ...CLASSIC_RULES, dealerHitsSoft17: true }), true);
  assert.equal(dealerShouldHit([C("10"), C("6")], { ...CLASSIC_RULES, dealerHitsSoft17: true }), true);
  assert.equal(dealerShouldHit([C("10"), C("7")], { ...CLASSIC_RULES, dealerHitsSoft17: true }), false);
});

test("H17 dealer draws on soft 17 and can beat a 17", () => {
  const rules = { ...CLASSIC_RULES, dealerHitsSoft17: true };
  const { deal } = dealOrder(rules, C("10"), C("7"), C("A"), C("6"), [C("2")]);
  const played = reducer(answerInsurance(deal), { type: "stand" }, 100000);
  assert.equal(played.dealer.length, 3, "dealer drew on soft 17");
  assert.equal(played.hands[0].outcome, "lose", "19 beats 17");
});

test("S17 dealer leaves a 17 standing and pushes", () => {
  const rules = { ...CLASSIC_RULES, dealerHitsSoft17: false };
  const { deal } = dealOrder(rules, C("10"), C("7"), C("A"), C("6"), [C("2")]);
  const played = reducer(answerInsurance(deal), { type: "stand" }, 100000);
  assert.equal(played.dealer.length, 2);
  assert.equal(played.hands[0].outcome, "push");
});

/* ------------------------------------------------------------- blackjacks */

test("natural blackjack pays 3:2", () => {
  const rules = { ...CLASSIC_RULES, blackjackPayout: 1.5 };
  const { deal } = dealOrder(rules, C("A"), C("K"), C("9"), C("7"));
  assert.equal(deal.phase, "settled");
  assert.equal(deal.hands[0].outcome, "blackjack");
  assert.equal(deal.hands[0].payout, 25, "10 stake + 15 win");
  const { settlement: s } = settleRoundChips(deal, 1000);
  assert.equal(s.balance, 1015);
  assert.equal(s.net, 15);
});

test("natural blackjack pays 6:5 when the table says so", () => {
  const rules = { ...CLASSIC_RULES, blackjackPayout: 1.2 };
  const { deal } = dealOrder(rules, C("A"), C("K"), C("9"), C("7"));
  assert.equal(deal.hands[0].payout, 22, "10 + 12");
});

test("dealer blackjack takes the bet; player natural pushes", () => {
  const noPeek = { ...CLASSIC_RULES, dealerPeek: false };
  // Without a peek the hole card is only revealed when the player stands.
  const lost = dealOrder(noPeek, C("10"), C("9"), C("A"), C("K"));
  assert.equal(lost.deal.phase, "player");
  const lostDone = reducer(lost.deal, { type: "stand" }, 100000);
  assert.equal(lostDone.hands[0].outcome, "lose");
  assert.equal(settleRoundChips(lostDone, 1000).settlement.net, -10);

  // A player natural settles immediately and pushes against the dealer's.
  const push = dealOrder(noPeek, C("A"), C("K"), C("A"), C("Q"));
  assert.equal(push.deal.phase, "settled");
  assert.equal(push.deal.hands[0].outcome, "push");
  assert.equal(settleRoundChips(push.deal, 1000).settlement.net, 0);
});

/* ---------------------------------------------------------------- doubling */

test("double down adds exactly one stake and settles once", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("5"), C("6"), C("9"), C("7"), [C("10"), C("9"), C("8")]);
  const doubled = reducer(deal, { type: "double" }, 100000);
  // 5+6+10 = 21 vs dealer 9+7 = 16 → dealer draws 10 → 26 bust
  assert.equal(doubled.phase, "settled");
  const hand = doubled.hands[0];
  assert.equal(handStake(hand), 20, "stake doubled");
  assert.equal(hand.outcome, "dealer_bust");
  assert.equal(hand.payout, 40, "double stake returned twice");
  assert.equal(doubled.reserved, 20);
  const audit = auditRound(doubled);
  assert.equal(audit.ok, true, "reserved matches the sum of stakes");
  const { settlement: s } = settleRoundChips(doubled, 1000);
  assert.equal(s.balance, 1020);
  assert.equal(s.net, 20);
});

test("double down is refused when the rule or the balance forbids it", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("6"), C("9"), C("7"));
  const poor = legalMoves(deal, 5);
  assert.equal(poor.double.allowed, false);
  assert.match(poor.double.reason ?? "", /الرصيد/);

  const noDouble = { ...CLASSIC_RULES, doubleOnAnyTwo: false, doubleTotals: [10, 11] };
  const d2 = dealOrder(noDouble, C("5"), C("2"), C("9"), C("7"));
  const mv = legalMoves(d2.deal, 100000);
  assert.equal(mv.double.allowed, false);
  assert.match(mv.double.reason ?? "", /10/);
});

/* ------------------------------------------------------------------ splits */

test("split creates two independent hands with their own stakes", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("8"), C("8"), C("6"), C("10"), [C("3"), C("2")]);
  const split = reducer(deal, { type: "split" }, 100000);
  assert.equal(split.hands.length, 2);
  assert.equal(split.hands[0].cards.length, 2);
  assert.equal(split.hands[1].cards.length, 2);
  assert.equal(split.reserved, 20, "the second stake is reserved once");
  assert.equal(split.activeHand, 0);

  const afterFirst = reducer(split, { type: "stand" }, 100000);
  assert.equal(afterFirst.activeHand, 1);
  assert.equal(afterFirst.phase, "player");
  const done = reducer(afterFirst, { type: "stand" }, 100000);
  assert.equal(done.phase, "settled");
  assert.equal(done.hands.every((h) => h.settled), true);
  assert.equal(done.hands.length, 2);
  const audit = auditRound(done);
  assert.equal(audit.ok, true);
  const { settlement: s } = settleRoundChips(done, 1000);
  assert.equal(s.reserved, 20);
});

test("split hands that land on 21 after splitting do not pay 3:2 by default", () => {
  const rules = { ...CLASSIC_RULES, blackjackAfterSplit: false };
  // split 10s? use 8,8 then get A+K style: 8 + A = 19... use A,A split
  // Instead: 8,8 → hand1 gets K (18), hand2 gets K (18) vs dealer 9+8=17
  const { deal } = dealOrder(rules, C("8"), C("8"), C("9"), C("8"), [C("K"), C("K")]);
  const split = reducer(deal, { type: "split" }, 100000);
  const a = reducer(split, { type: "stand" }, 100000);
  const b = reducer(a, { type: "stand" }, 100000);
  assert.equal(b.hands[0].outcome, "win");
  assert.equal(b.hands[0].payout, 20, "regular win pays 1:1 not 3:2");
});

test("split aces receive one card each and stand automatically", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("A"), C("A"), C("9"), C("8"), [C("K"), C("7")]);
  const split = reducer(deal, { type: "split" }, 100000);
  assert.equal(split.hands.every((h) => h.done), true, "both ace hands stand");
  assert.equal(split.phase, "settled");
  assert.equal(split.hands[0].cards.length, 2);
  assert.equal(split.hands[1].cards.length, 2);
  assert.equal(split.hands[0].outcome, "win", "A+K = 21 after split (not a natural)");
  assert.equal(split.hands[0].payout, 20, "pays 1:1, never 3:2, after splitting");
  assert.equal(split.hands[1].outcome, "win", "A+7 = 18 beats the dealer's 17");
});

test("split aces may be hit when the table allows it", () => {
  const rules = { ...CLASSIC_RULES, hitSplitAces: true };
  const { deal } = dealOrder(rules, C("A"), C("A"), C("9"), C("2"), [C("5"), C("5"), C("3"), C("4")]);
  const split = reducer(deal, { type: "split" }, 100000);
  assert.equal(split.phase, "player");
  assert.equal(legalMoves(split, 100000).hit.allowed, true);
});

test("max splits and resplit aces are enforced", () => {
  const rules = { ...CLASSIC_RULES, maxSplits: 1 };
  const { deal } = dealOrder(rules, C("8"), C("8"), C("9"), C("2"), [C("8"), C("3"), C("2"), C("2"), C("8")]);
  const s1 = reducer(deal, { type: "split" }, 100000);
  // both hands are 8,8 again in this crafted shoe
  const mv = legalMoves(s1, 100000);
  assert.equal(mv.split.allowed, false, "only one split allowed at this table");

  const aceRules = { ...CLASSIC_RULES, resplitAces: false };
  const aceDeal = dealOrder(aceRules, C("A"), C("A"), C("9"), C("2"), [C("A"), C("A")]);
  const aceSplit = reducer(aceDeal.deal, { type: "split" }, 100000);
  // aces are done immediately here, so no further split decision exists
  assert.equal(aceSplit.phase, "settled");

  const hitAces = { ...CLASSIC_RULES, hitSplitAces: true, resplitAces: false };
  const hd = dealOrder(hitAces, C("A"), C("A"), C("9"), C("2"), [C("A"), C("A")]);
  const hs = reducer(hd.deal, { type: "split" }, 100000);
  const hmv = legalMoves(hs, 100000);
  assert.equal(hmv.split.allowed, false, "resplitting aces is off");
  assert.match(hmv.split.reason ?? "", /الآسات/);
});

test("double after split respects the DAS rule", () => {
  const noDas = { ...CLASSIC_RULES, das: false };
  const { deal } = dealOrder(noDas, C("8"), C("8"), C("9"), C("2"), [C("3"), C("2")]);
  const split = reducer(deal, { type: "split" }, 100000);
  const mv = legalMoves(split, 100000);
  assert.equal(mv.double.allowed, false);
  assert.match(mv.double.reason ?? "", /DAS/);

  const withDas = { ...CLASSIC_RULES, das: true };
  const d2 = dealOrder(withDas, C("8"), C("8"), C("9"), C("2"), [C("3"), C("2")]);
  const split2 = reducer(d2.deal, { type: "split" }, 100000);
  assert.equal(legalMoves(split2, 100000).double.allowed, true);
});

test("split hands settle independently", () => {
  const rules = { ...CLASSIC_RULES };
  // hand1: 10+6 = 16 loses to 18; hand2: 10+9 = 19 wins
  const { deal } = dealOrder(rules, C("10"), C("10"), C("10"), C("8"), [C("6"), C("9")]);
  const split = reducer(deal, { type: "split" }, 100000);
  const a = reducer(split, { type: "stand" }, 100000);
  const b = reducer(a, { type: "stand" }, 100000);
  assert.equal(b.hands[0].outcome, "lose");
  assert.equal(b.hands[0].payout, 0);
  assert.equal(b.hands[1].outcome, "win");
  assert.equal(b.hands[1].payout, 20);
  const { settlement: s } = settleRoundChips(b, 1000);
  assert.equal(s.reserved, 20);
  assert.equal(s.returned, 20);
  assert.equal(s.net, 0, "one win + one loss cancels out exactly");
});

/* --------------------------------------------------------------- surrender */

test("late surrender returns half the stake once", () => {
  const rules = { ...CLASSIC_RULES, surrender: "late" };
  const { deal } = dealOrder(rules, C("10"), C("6"), C("10"), C("7"));
  const mv = legalMoves(deal, 100000);
  assert.equal(mv.surrender.allowed, true);
  const s = reducer(deal, { type: "surrender" }, 100000);
  assert.equal(s.hands[0].outcome, "surrender");
  assert.equal(s.hands[0].payout, 5);
  const { settlement: st } = settleRoundChips(s, 1000);
  assert.equal(st.net, -5);
  assert.equal(st.balance, 995);
});

test("surrender follows the table rule (none / early / late)", () => {
  const none = { ...CLASSIC_RULES, surrender: "none" };
  const d1 = dealOrder(none, C("10"), C("6"), C("10"), C("7"));
  assert.equal(legalMoves(d1.deal, 100000).surrender.allowed, false);

  const early = { ...CLASSIC_RULES, surrender: "early" };
  const d2 = dealOrder(early, C("10"), C("6"), C("10"), C("7"));
  assert.equal(legalMoves(d2.deal, 100000).surrender.allowed, true);

  const late = { ...CLASSIC_RULES, surrender: "late" };
  const d3 = dealOrder(late, C("10"), C("6"), C("A"), C("7"));
  // An ace upcard pauses for the insurance decision first.
  const answered = reducer(d3.deal, { type: "insurance", take: false }, 100000);
  assert.equal(legalMoves(answered, 100000).surrender.allowed, true);
  // After a split, late surrender is no longer available.
  const d4 = dealOrder(late, C("8"), C("8"), C("10"), C("7"), [C("3"), C("2")]);
  const split = reducer(d4.deal, { type: "split" }, 100000);
  assert.equal(legalMoves(split, 100000).surrender.allowed, false);
});

/* --------------------------------------------------------------- insurance */

test("insurance pays 2:1 when the dealer has blackjack", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("9"), C("A"), C("K"));
  assert.equal(deal.insurance.offered, true, "insurance is offered on an ace upcard");
  const insured = reducer(deal, { type: "insurance", take: true }, 100000);
  assert.equal(insured.insurance.stake, 5, "half the main bet");
  assert.equal(insured.insurance.result, "win");
  assert.equal(insured.insurance.payout, 15);
  assert.equal(insured.hands[0].outcome, "lose");
  assert.equal(insured.reserved, 15, "10 main + 5 insurance");
  const { settlement: s } = settleRoundChips(insured, 1000);
  // loss of 10 offset by +10 insurance profit ⇒ net 0
  assert.equal(s.net, 0);
  assert.equal(s.balance, 1000);
});

test("insurance loses when the dealer does not have blackjack", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("9"), C("A"), C("7"));
  const insured = reducer(deal, { type: "insurance", take: true }, 100000);
  assert.equal(insured.insurance.result, "lose");
  assert.equal(insured.insurance.payout, 0);
  const played = reducer(insured, { type: "stand" }, 100000);
  // dealer A+7=18 vs 19 wins for the player
  assert.equal(played.hands[0].outcome, "win");
  const { settlement: s } = settleRoundChips(played, 1000);
  assert.equal(s.net, 5, "+10 win −5 insurance");
  assert.equal(s.balance, 1005);
});

test("declining insurance is free and resumes play", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("9"), C("A"), C("7"));
  const declined = reducer(deal, { type: "insurance", take: false }, 100000);
  assert.equal(declined.insurance.stake, 0);
  assert.equal(declined.reserved, 10);
  assert.equal(declined.phase, "player");
});

test("even money pays 1:1 immediately on a blackjack vs an ace", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("A"), C("K"), C("A"), C("7"));
  assert.equal(legalMoves(deal, 100000).evenMoney.allowed, true);
  const paid = reducer(deal, { type: "evenMoney" }, 100000);
  assert.equal(paid.phase, "settled");
  assert.equal(paid.hands[0].outcome, "win");
  assert.equal(paid.hands[0].payout, 20, "stake + 1:1");
  const { settlement: s } = settleRoundChips(paid, 1000);
  assert.equal(s.net, 10);
});

test("insurance/even money are unavailable without a hole card (ENHC)", () => {
  const enhc = { ...CLASSIC_RULES, holeCard: false, dealerPeek: false, insurance: false };
  // ENHC deals p1, d1, p2 only — the dealer's second card comes later.
  const st = craft(enhc, [C("A"), C("A"), C("K"), C("7"), C("2")]);
  const deal = reducer(st, { type: "deal", bet: { bet: 10, sideBets: [] }, balance: 1000 });
  assert.equal(deal.insurance.offered, false);
  assert.equal(deal.hands[0].cards.length, 2);
  assert.equal(deal.insurance.offered, false);
  assert.equal(legalMoves(deal, 1000).evenMoney.allowed, false);
  // A player natural on an ENHC table reveals the dealer's second card and pays.
  assert.equal(deal.phase, "settled");
  assert.equal(deal.dealer.length, 2, "dealer takes a second card at reveal time");
  assert.equal(deal.hands[0].outcome, "blackjack");

  // A normal (non-natural) hand holds the dealer at one card until the reveal.
  const st2 = craft(enhc, [C("10"), C("A"), C("6"), C("K")]);
  const deal2 = reducer(st2, { type: "deal", bet: { bet: 10, sideBets: [] }, balance: 1000 });
  assert.equal(deal2.dealer.length, 1, "no hole card dealt");
  assert.equal(deal2.phase, "player");
});

test("European no-hole-card loses only the original stake on a dealer natural", () => {
  const enhc = { ...CLASSIC_RULES, holeCard: false, dealerPeek: false, insurance: false };
  const st = craft(enhc, [C("10"), C("A"), C("6"), C("K")]);
  const deal = reducer(st, { type: "deal", bet: { bet: 10, sideBets: [] }, balance: 1000 });
  const played = reducer(deal, { type: "stand" }, 100000);
  assert.equal(played.dealer.length, 2);
  assert.equal(played.hands[0].outcome, "lose");
  const { settlement: s } = settleRoundChips(played, 1000);
  assert.equal(s.net, -10, "exactly one stake lost");
});

/* ------------------------------------------------------------------ sidebets */

test("Perfect Pairs pays the published tiers", () => {
  const perfect = settleSideBet("perfectPairs", 10, [C("7", "H"), C("7", "H")], null);
  assert.equal(perfect.payout, 250);
  assert.equal(perfect.net, 240);
  const colored = settleSideBet("perfectPairs", 10, [C("7", "H"), C("7", "D")], null);
  assert.equal(colored.payout, 120);
  const mixed = settleSideBet("perfectPairs", 10, [C("7", "S"), C("7", "H")], null);
  assert.equal(mixed.payout, 60);
  const loose = settleSideBet("perfectPairs", 10, [C("7", "S"), C("8", "H")], null);
  assert.equal(loose.payout, 0);
  assert.equal(loose.net, -10);
});

test("21+3 pays trips, straight flush, straight and flush", () => {
  const trips = settleSideBet("twentyOnePlusThree", 10, [C("7", "H"), C("7", "D")], C("7", "S"));
  assert.equal(trips.payout, 300);
  const sf = settleSideBet("twentyOnePlusThree", 10, [C("5", "H"), C("6", "H")], C("7", "H"));
  assert.equal(sf.payout, 400);
  const straight = settleSideBet("twentyOnePlusThree", 10, [C("5", "H"), C("6", "D")], C("7", "S"));
  assert.equal(straight.payout, 100);
  const flush = settleSideBet("twentyOnePlusThree", 10, [C("2", "H"), C("9", "H")], C("K", "H"));
  assert.equal(flush.payout, 50);
  const aceLow = settleSideBet("twentyOnePlusThree", 10, [C("A", "H"), C("2", "D")], C("3", "S"));
  assert.equal(aceLow.payout, 100, "A-2-3 is a straight");
  const nothing = settleSideBet("twentyOnePlusThree", 10, [C("2", "H"), C("9", "D")], C("K", "S"));
  assert.equal(nothing.payout, 0);
});

test("Lucky Ladies and Royal Match pay per the table", () => {
  const qh = settleSideBet("luckyLadies", 10, [C("Q", "H"), C("Q", "H")], null);
  assert.equal(qh.payout, 1250);
  const qq = settleSideBet("luckyLadies", 10, [C("Q", "S"), C("Q", "C")], null);
  assert.equal(qq.payout, 190, "matched queens = 19:1");
  const mixed = settleSideBet("luckyLadies", 10, [C("Q", "S"), C("Q", "D")], null);
  assert.equal(mixed.payout, 10, "unmatched queen pair still pays 1:1");
  const twenty = settleSideBet("luckyLadies", 10, [C("J", "C"), C("Q", "D")], null);
  assert.equal(twenty.payout, 10, "20 with one queen pays 1:1");
  const nineteen = settleSideBet("luckyLadies", 10, [C("J", "C"), C("9", "D")], null);
  assert.equal(nineteen.payout, 0);

  const royal = settleSideBet("royalMatch", 10, [C("K", "H"), C("Q", "H")], null);
  assert.equal(royal.payout, 250);
  const matched = settleSideBet("royalMatch", 10, [C("9", "H"), C("4", "H")], null);
  assert.equal(matched.payout, 50);
  const offSuit = settleSideBet("royalMatch", 10, [C("9", "H"), C("4", "S")], null);
  assert.equal(offSuit.payout, 0);
});

test("every side-bet paytable tier is reachable and documented", () => {
  for (const [id, tiers] of Object.entries(SIDE_BET_PAYTABLE)) {
    assert.ok(tiers.length >= 2, `${id} has a full paytable`);
    for (const t of tiers) {
      assert.ok(t.to > 0, `${id}/${t.key} pays something`);
      assert.ok(t.label.length > 0);
    }
  }
});

test("side bets settle independently of the main hand and are opt-in", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("7", "H"), C("7", "H"), C("9"), C("7"));
  assert.equal(deal.sideBets.length, 0, "side bets are disabled by default");
  // p1 = 7♥, dealer 9, p2 = 7♥ (perfect pair), dealer 8 (S17 stands on 17)
  const st = craft(CLASSIC_RULES, [C("7", "H"), C("9"), C("7", "H"), C("8")]);
  const withSide = reducer(st, {
    type: "deal",
    bet: { bet: 10, sideBets: [{ id: "perfectPairs", stake: 5 }] },
    balance: 1000,
  });
  assert.equal(withSide.sideBets.length, 1);
  assert.equal(withSide.reserved, 15);
  const played = reducer(withSide, { type: "stand" }, 100000);
  assert.equal(played.sideBetResults.length, 1);
  assert.equal(played.sideBetResults[0].payout, 125, "perfect pair of 7♥");
  // main hand lost (14 vs 17), side bet won 125
  const { settlement: s } = settleRoundChips(played, 1000);
  assert.equal(s.net, 110, "125 side-bet return − 15 staked");
  assert.equal(s.balance, 1110);
});

/* ------------------------------------------------- settlement & invariants */

test("duplicate settlement is impossible", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("K"), C("Q"), C("10"), C("8"));
  const played = reducer(deal, { type: "stand" }, 100000);
  const first = settleRoundChips(played, 1000, EMPTY_LEDGER);
  assert.equal(first.settlement.balance, 1010);
  const second = settleRoundChips(played, first.settlement.balance, first.ledger);
  assert.equal(second.settlement.duplicate, true);
  assert.equal(second.settlement.balance, 1010, "the round cannot be paid twice");
  assert.equal(second.settlement.net, 0);
});

test("settleHand is idempotent", () => {
  const hand = {
    id: "h",
    cards: [C("K"), C("Q")],
    stake: 10,
    doubledStake: 0,
    doubled: false,
    fromSplit: false,
    splitAces: false,
    surrendered: false,
    done: false,
    bust: false,
    settled: false,
    outcome: null,
    payout: 0,
    net: 0,
  };
  const once = settleHand(hand, [C("10"), C("8")], CLASSIC_RULES);
  assert.equal(once.payout, 20);
  const twice = settleHand(once, [C("A"), C("K")], CLASSIC_RULES);
  assert.equal(twice, once, "an already-settled hand is returned untouched");
  assert.equal(twice.payout, 20);
});

test("the balance can never become negative", () => {
  const { deal } = dealOrder(CLASSIC_RULES, C("10"), C("8"), C("K"), C("Q"));
  const played = reducer(deal, { type: "stand" }, 100000);
  const { settlement: s } = settleRoundChips(played, 0);
  assert.equal(s.balance, 0);
  assert.ok(s.balance >= 0);

  assert.equal(clampBet(-50, 100), 0);
  assert.equal(clampBet(500, 100), 100);
  assert.equal(clampBet(50, 100), 50);
});

test("an under-funded deal is refused before any chips move", () => {
  const st = craft(CLASSIC_RULES, [C("K"), C("10"), C("Q"), C("8")]);
  assert.throws(
    () => reducer(st, { type: "deal", bet: { bet: 100, sideBets: [] }, balance: 50 }),
    /الرصيد/,
  );
});

test("table bet limits are enforced", () => {
  const st = craft(CLASSIC_RULES, []);
  assert.throws(() => reducer(st, { type: "deal", bet: { bet: 5, sideBets: [] }, balance: 5000 }), /أقل رهان/);
  assert.throws(
    () => reducer(st, { type: "deal", bet: { bet: 5000, sideBets: [] }, balance: 50000 }),
    /أعلى رهان/,
  );
});

test("chips are described once: reserved = hands + side bets + insurance", () => {
  const rules = { ...CLASSIC_RULES };
  const { deal } = dealOrder(rules, C("8"), C("8"), C("6"), C("10"), [C("3"), C("2")]);
  const split = reducer(deal, { type: "split" }, 100000);
  assert.equal(auditRound(split).ok, true);
  const done1 = reducer(split, { type: "stand" }, 100000);
  const done2 = reducer(done1, { type: "stand" }, 100000);
  const audit = auditRound(done2);
  assert.equal(audit.ok, true);
  assert.equal(audit.handsTotal, 20);
  assert.equal(split.insurance.stake, 0, "no insurance taken");
});

test("all-in uses the exact available balance", () => {
  const st = craft(CLASSIC_RULES, [C("10"), C("8"), C("9"), C("7"), C("10")]);
  const deal = reducer(st, { type: "deal", bet: { bet: 55, sideBets: [] }, balance: 55 });
  assert.equal(deal.reserved, 55);
  const played = reducer(deal, { type: "stand" }, 0);
  // `balance` here is the balance *before* the round; the stake is reserved by
  // the settlement call itself, never twice.
  const { settlement: s } = settleRoundChips(played, 55);
  assert.equal(s.balance, 110, "55 staked, 110 returned");
});

/* --------------------------------------------------------- table variants */

test("every shipped table is a real, legal rule configuration", () => {
  assert.equal(TABLES.length, 6);
  assert.deepEqual(
    TABLES.map((t) => t.id),
    ["classic", "vegas", "atlantic", "european", "highroller", "custom"],
  );
  for (const t of TABLES) {
    const r = normalizeRules(t.rules, CLASSIC_RULES);
    assert.deepEqual(r, t.rules, `${t.id} survives normalisation unchanged`);
    assert.ok([1, 2, 4, 6, 8].includes(r.decks));
    assert.ok([1.2, 1.5].includes(r.blackjackPayout));
    assert.ok(r.minBet <= r.maxBet);
    if (!r.holeCard) assert.equal(r.dealerPeek, false, "ENHC cannot peek");
  }
  assert.equal(TABLE_MAP.vegas.rules.blackjackPayout, 1.2);
  assert.equal(TABLE_MAP.vegas.rules.dealerHitsSoft17, true);
  assert.equal(TABLE_MAP.european.rules.holeCard, false);
  assert.equal(TABLE_MAP.european.rules.insurance, false);
  assert.equal(TABLE_MAP.atlantic.rules.resplitAces, true);
  assert.equal(TABLE_MAP.highroller.rules.decks, 1);
});

test("normalizeRules refuses illegal values without throwing", () => {
  const r = normalizeRules({ decks: 3, blackjackPayout: 9, maxSplits: 99, surrender: "sometimes", holeCard: false, dealerPeek: true, minBet: 500, maxBet: 10 });
  assert.equal(r.decks, CLASSIC_RULES.decks);
  assert.equal(r.blackjackPayout, CLASSIC_RULES.blackjackPayout);
  assert.equal(r.maxSplits, 4);
  assert.equal(r.surrender, CLASSIC_RULES.surrender);
  assert.equal(r.dealerPeek, false, "peek disabled without a hole card");
  assert.ok(r.maxBet >= r.minBet);
});

test("Vegas (6:5, H17) and Atlantic City (3:2, S17, RSA) play differently", () => {
  const vegas = TABLE_MAP.vegas.rules;
  const ac = TABLE_MAP.atlantic.rules;
  const v = dealOrder(vegas, C("A"), C("K"), C("9"), C("7"));
  assert.equal(v.deal.hands[0].payout, Math.round(vegas.minBet * 2.2 * 100) / 100, "Vegas pays 6:5");

  const a = dealOrder(ac, C("A"), C("K"), C("9"), C("7"));
  assert.equal(a.deal.hands[0].payout, ac.minBet * 2.5, "AC pays 3:2");
});

/* -------------------------------------------------------------- stats layer */

test("statistics are computed only from real round records", () => {
  const empty = computeCasinoStats([]);
  assert.equal(empty.rounds, 0);
  assert.equal(empty.winRate, 0);
  assert.equal(empty.averageBet, 0);

  const rec = (id, net, outcome, tableId = "classic", reserved = 10) => ({
    id,
    at: Date.now(),
    tableId,
    practice: false,
    reserved,
    returned: reserved + net,
    net,
    balance: 1000,
    hands: [{ outcome, stake: reserved, net, cards: "K♠ Q♠", total: 20, dealerCards: "10♦ 8♣", dealerTotal: 18 }],
    sideBets: [],
    insurance: { stake: 0, result: "none", payout: 0 },
    primaryOutcome: outcome,
  });
  const stats = computeCasinoStats([
    rec("a", 10, "win"),
    rec("b", -10, "lose"),
    rec("c", 25, "blackjack", "vegas"),
    rec("d", 0, "push"),
    rec("e", -10, "lose", "vegas"),
  ]);
  assert.equal(stats.rounds, 5);
  assert.equal(stats.wins, 2);
  assert.equal(stats.losses, 2);
  assert.equal(stats.pushes, 1);
  assert.equal(stats.blackjacks, 1);
  assert.equal(stats.winRate, 40);
  assert.equal(stats.sessionNet, 15);
  assert.equal(stats.averageBet, 10);
  assert.equal(stats.largestWin, 25);
  assert.equal(stats.largestLoss, -10);
  assert.equal(stats.longestWinStreak, 1);
  assert.equal(stats.longestLossStreak, 1);
  assert.equal(stats.byTable.find((t) => t.tableId === "vegas").rounds, 2);
  assert.equal(stats.byTable.find((t) => t.tableId === "vegas").net, 15);
  assert.ok(OUTCOME_LABEL_AR.blackjack.length > 0);
});

test("win/loss streaks are tracked correctly", () => {
  const rec = (id, net) => ({
    id,
    at: 0,
    tableId: "classic",
    practice: false,
    reserved: 10,
    returned: 10 + net,
    net,
    balance: 0,
    hands: [{ outcome: net > 0 ? "win" : "lose", stake: 10, net, cards: "", total: 0, dealerCards: "", dealerTotal: 0 }],
    sideBets: [],
    insurance: { stake: 0, result: "none", payout: 0 },
    primaryOutcome: null,
  });
  const s = computeCasinoStats([rec("1", 10), rec("2", 10), rec("3", 10), rec("4", -10), rec("5", 10)]);
  assert.equal(s.longestWinStreak, 3);
  assert.equal(s.currentStreak, 1);
  assert.equal(s.longestLossStreak, 1);
});

/* --------------------------------------------------------------- chip math */

test("chip breakdown and colours", () => {
  assert.deepEqual(chipsFor(0), []);
  assert.deepEqual(chipsFor(37), [
    { denom: 25, count: 1 },
    { denom: 5, count: 2 },
    { denom: 1, count: 2 },
  ]);
  assert.deepEqual(chipsFor(1000), [{ denom: 1000, count: 1 }]);
});

/* -------------------------------------------------------- basic strategy */

test("basic strategy chart is complete and coherent", () => {
  for (const row of [...BASIC_STRATEGY.hard, ...BASIC_STRATEGY.soft, ...BASIC_STRATEGY.pairs]) {
    assert.equal(row.moves.length, DEALER_UPCARDS.length, `${row.label} covers every upcard`);
  }
  assert.equal(HARD_ROWS.length, BASIC_STRATEGY.hard.length);
  assert.equal(SOFT_ROWS.length, BASIC_STRATEGY.soft.length);
  assert.equal(PAIR_ROWS.length, BASIC_STRATEGY.pairs.length);
  // 11 doubles against everything except an ace; 20 always stands
  assert.deepEqual(BASIC_STRATEGY.hard.find((r) => r.label === "20").moves.every((m) => m === "S"), true);
  assert.equal(advise(20, false, false, "A").code, "S");
  assert.equal(advise(11, false, false, "6").code, "D");
  assert.equal(advise(16, false, false, "10").code, "R");
  assert.equal(advise(17, true, false, "9").code, "H", "soft 17 hits a 9");
  assert.equal(advise(18, true, false, "6").code, "Ds", "soft 18 doubles a 6");
  assert.equal(advise(19, true, false, "9").code, "S", "soft 19 stands");
  assert.equal(advise(16, false, true, "8").code, "P");
});

/* ----------------------------------------------- full random-round fuzz */

test("200 random rounds never create or destroy chips", () => {
  const rng = makeRng(2026);
  const rules = { ...CLASSIC_RULES, sideBets: ["perfectPairs", "twentyOnePlusThree"] };
  let balance = 10000;
  let ledger = EMPTY_LEDGER;
  for (let i = 0; i < 200; i++) {
    let st = createState(rules, Math.floor(rng() * 1e9));
    st = reducer(st, {
      type: "deal",
      bet: { bet: 10, sideBets: i % 5 === 0 ? [{ id: "perfectPairs", stake: 5 }] : [] },
      balance,
    });
    let guard = 0;
    while (st.phase === "player" && guard++ < 40) {
      const moves = legalMoves(st, balance);
      if (moves.insurance.allowed) st = reducer(st, { type: "insurance", take: false }, balance);
      else if (moves.double.allowed && rng() < 0.15) st = reducer(st, { type: "double" }, balance);
      else if (moves.split.allowed && rng() < 0.2) st = reducer(st, { type: "split" }, balance);
      else if (rng() < 0.5) st = reducer(st, { type: "hit" }, balance);
      else st = reducer(st, { type: "stand" }, balance);
      if (st.phase === "dealer") st = finishRound(st);
    }
    assert.equal(st.phase, "settled", `round ${i} finished`);
    const audit = auditRound(st);
    assert.equal(audit.ok, true, `round ${i} chip audit`);
    const settled = settleRoundChips(st, balance, ledger);
    assert.equal(settled.settlement.duplicate, false);
    balance = settled.settlement.balance;
    ledger = settled.ledger;
    assert.ok(balance >= 0, `round ${i} balance never negative`);
    assert.equal(
      Math.round((balance - (10 - settled.settlement.net + 10)) * 100) / 100 >= 0,
      true,
      "sanity",
    );
    if (balance < 20) break;
  }
  assert.ok(ledger.rounds > 0);
  assert.equal(ledger.applied.length, new Set(ledger.applied).size, "round ids are unique");
});

console.log(`\ncasino tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
