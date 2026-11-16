/**
 * CASINO — Blackjack rules engine (pure: no DOM, no React, no network).
 *
 * The UI only ever calls `reducer(state, action)` and reads `legalMoves()`.
 * All dealing, dealer behaviour, split/double/surrender/insurance handling and
 * hand resolution live here, which is what makes deterministic unit tests
 * possible (fixed shoes, no time or randomness leaks beyond the shuffle seed).
 *
 * Invariants that the settlement layer relies on:
 *  • A hand is `done` once the player can no longer act on it, and `settled`
 *    once chips have been assigned. `settleHand` returns an already-settled
 *    hand untouched, so double payouts are impossible.
 *  • Chips are described, never silently mutated: `reserved` (taken from the
 *    balance when the cards are dealt) and `returned` (credited at settlement).
 *  • Every stake is validated before it is reserved, so a balance can never go
 *    negative.
 */

import {
  freshShoe,
  handValue,
  isBlackjack,
  isSplittablePair,
  makeRng,
  shuffle,
  type Card,
  type DeckCount,
} from "./cards";
import { settleSideBet, type SideBetId, type SideBetResult } from "./sideBets";
import type { TableRules } from "./tables";

export type Phase = "betting" | "player" | "dealer" | "settled";

export type HandOutcome =
  | "blackjack"
  | "win"
  | "lose"
  | "push"
  | "surrender"
  | "bust"
  | "dealer_bust";

export interface Hand {
  id: string;
  cards: Card[];
  /** Base stake for this hand (debited from the balance when dealt). */
  stake: number;
  /** Extra stake added by a double down. */
  doubledStake: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  surrendered: boolean;
  /** The player can no longer act on this hand. */
  done: boolean;
  bust: boolean;
  settled: boolean;
  outcome: HandOutcome | null;
  /** Gross chips returned for this hand (stake included). */
  payout: number;
  /** payout − total stake. */
  net: number;
}

export interface InsuranceState {
  /** The table is waiting for the insurance decision. */
  offered: boolean;
  /** Chips taken for insurance (debited from the balance). */
  stake: number;
  result: "win" | "lose" | "none";
  payout: number;
}

export interface GameState {
  phase: Phase;
  rules: TableRules;
  shoe: Card[];
  /** Size of a full shoe for the table's deck count (reshuffle threshold). */
  shoeStart: number;
  hands: Hand[];
  activeHand: number;
  dealer: Card[];
  /** The hole card is face down. */
  holeHidden: boolean;
  dealerHasBlackjack: boolean;
  insurance: InsuranceState;
  sideBets: { id: SideBetId; stake: number }[];
  sideBetResults: SideBetResult[];
  /** Chips debited from the balance for this round. */
  reserved: number;
  /** Chips credited back at settlement. */
  returned: number;
  roundId: string;
  notes: string[];
}

export interface BetInput {
  bet: number;
  sideBets: { id: SideBetId; stake: number }[];
}

export type Action =
  | { type: "deal"; bet: BetInput; balance: number }
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" }
  | { type: "split" }
  | { type: "surrender" }
  | { type: "insurance"; take: boolean }
  | { type: "evenMoney" }
  | { type: "reveal" }
  | { type: "next" };

export interface LegalMove {
  allowed: boolean;
  /** Why the move is unavailable (Arabic, user-facing). */
  reason?: string;
}

export type LegalMoves = Record<
  "hit" | "stand" | "double" | "split" | "surrender" | "insurance" | "evenMoney" | "insuranceDone" | "next",
  LegalMove
>;

export const MAX_HANDS = 5;
/** The shoe is only reshuffled once it is actually empty (no cut-card surprises). */
export const RESHUFFLE_AT_EMPTY = true;

let handCounter = 0;
const makeHandId = (): string => {
  handCounter += 1;
  return `h${handCounter}`;
};
/** Test hook so snapshots stay deterministic. */
export function __resetHandIds() {
  handCounter = 0;
}

export function createShoe(decks: DeckCount, seed?: number): Card[] {
  const rng = seed === undefined ? Math.random : makeRng(seed);
  return shuffle(freshShoe(decks), rng);
}

export function createState(rules: TableRules, seed?: number): GameState {
  return {
    phase: "betting",
    rules,
    shoe: createShoe(rules.decks, seed),
    shoeStart: rules.decks * 52,
    hands: [],
    activeHand: 0,
    dealer: [],
    holeHidden: true,
    dealerHasBlackjack: false,
    insurance: { offered: false, stake: 0, result: "none", payout: 0 },
    sideBets: [],
    sideBetResults: [],
    reserved: 0,
    returned: 0,
    roundId: "r0",
    notes: [],
  };
}

/* --------------------------------------------------------------- utilities */

function draw(state: GameState): { card: Card; state: GameState } {
  let shoe = state.shoe;
  let notes = state.notes;
  let shoeStart = state.shoeStart;
  if (shoe.length === 0) {
    shoe = createShoe(state.rules.decks);
    shoeStart = shoe.length;
    notes = [...notes, "أُعيد خلط الحذاء (Shoe reshuffled)."];
  }
  const card = shoe[shoe.length - 1]!;
  return { card, state: { ...state, shoe: shoe.slice(0, -1), shoeStart, notes } };
}

export const handStake = (h: Hand): number => h.stake + h.doubledStake;

export const totalStakedHands = (state: GameState): number =>
  state.hands.reduce((sum, h) => sum + handStake(h), 0);

export const sideBetsTotal = (state: GameState): number =>
  state.sideBets.reduce((sum, s) => sum + s.stake, 0);

/** The dealer's cards/total that may be shown to the player right now. */
export function dealerVisible(state: GameState): { cards: Card[]; total: number; soft: boolean } {
  const cards = state.holeHidden ? state.dealer.slice(0, 1) : state.dealer;
  const v = handValue(cards);
  return { cards, total: v.total, soft: v.soft };
}

/** Dealer hits below 17 and — under H17 — on soft 17. */
export function dealerShouldHit(cards: readonly Card[], rules: TableRules): boolean {
  const v = handValue(cards);
  if (v.total < 17) return true;
  return v.total === 17 && v.soft && rules.dealerHitsSoft17;
}

/** A natural pays like a blackjack (respecting the "after split" rule). */
export function isNatural(hand: Hand, rules: TableRules): boolean {
  if (!isBlackjack(hand.cards)) return false;
  if (hand.fromSplit && !rules.blackjackAfterSplit) return false;
  return true;
}

const isTenValue = (c: Card): boolean => c.r === "10" || c.r === "J" || c.r === "Q" || c.r === "K";

export function activeHand(state: GameState): Hand | null {
  return state.hands[state.activeHand] ?? null;
}

/** True when the table is waiting on the insurance/even-money decision. */
export function awaitingInsurance(state: GameState): boolean {
  return (
    state.phase === "player" &&
    state.insurance.offered &&
    state.insurance.result === "none" &&
    state.insurance.stake === 0
  );
}

/* ------------------------------------------------------------ legal moves */

export function legalMoves(state: GameState, balance = Number.POSITIVE_INFINITY): LegalMoves {
  const no = (reason: string): LegalMove => ({ allowed: false, reason });
  const yes: LegalMove = { allowed: true };
  const { rules } = state;
  const h = activeHand(state);

  const out: LegalMoves = {
    hit: no("الدور لم يبدأ بعد — ضع رهانك ثم وزّع الأوراق."),
    stand: no("الدور لم يبدأ بعد — ضع رهانك ثم وزّع الأوراق."),
    double: no("المضاعفة غير متاحة الآن."),
    split: no("التقسيم غير متاح الآن."),
    surrender: no("الاستسلام غير متاح الآن."),
    insurance: no("التأمين متاح فقط عندما تكون ورقة الموزّع آساً."),
    evenMoney: no("المال المتساوي متاح فقط عندما تكون ورقة الموزّع آساً ولديك بلاك جاك."),
    insuranceDone: no("لا توجد ورقة آس مكشوفة للموزّع."),
    next: no("أكمل الجولة الحالية أولاً."),
  };

  if (state.phase === "settled") {
    out.next = yes;
    return out;
  }
  if (state.phase !== "player") {
    if (state.phase === "dealer") out.next = no("الموزّع يلعب الآن…");
    return out;
  }

  // Insurance decision blocks every other action until it is answered.
  if (awaitingInsurance(state)) {
    const wait = "أجب عن التأمين أولاً (نعم أو لا) لإكمال الجولة.";
    out.hit = no(wait);
    out.stand = no(wait);
    out.double = no(wait);
    out.split = no(wait);
    out.surrender = no(wait);
    out.insurance = yes;
    out.insuranceDone = yes;
    const first = state.hands[0];
    if (first && rules.insurance && !rules.holeCard) {
      // ENHC tables cannot offer even money (no peek).
    }
    if (first && isNatural(first, rules) && state.dealer[0]?.r === "A" && rules.insurance) {
      out.evenMoney = yes;
    }
    return out;
  }

  if (!h) return out;

  const isFirstTwo = h.cards.length === 2 && !h.doubled;
  const isAcePair = h.cards[0]?.r === "A" && h.cards[1]?.r === "A";

  // HIT
  out.hit = h.splitAces && !rules.hitSplitAces
    ? no("الآس المقسوم يأخذ ورقة واحدة فقط على هذه الطاولة.")
    : yes;

  // STAND
  out.stand = yes;

  // DOUBLE
  if (!isFirstTwo) out.double = no("المضاعفة متاحة فقط على أول ورقتين.");
  else if (h.fromSplit && !rules.das) out.double = no("هذه الطاولة لا تسمح بالمضاعفة بعد التقسيم (DAS معطّل).");
  else if (h.splitAces && !rules.hitSplitAces) out.double = no("الآس المقسوم لا يُضاعف.");
  else if (rules.doubleOnAnyTwo === false && rules.doubleTotals.length === 0)
    out.double = no("هذه الطاولة لا تسمح بالمضاعفة.");
  else if (!rules.doubleOnAnyTwo && !rules.doubleTotals.includes(handValue(h.cards).total))
    out.double = no(`هذه الطاولة تسمح بالمضاعفة على المجاميع ${rules.doubleTotals.join("، ")} فقط.`);
  else if (h.stake > balance) out.double = no("الرصيد لا يكفي لمضاعفة الرهان.");
  else out.double = yes;

  // SPLIT
  const splitsUsed = state.hands.filter((x) => x.fromSplit).length;
  if (!isFirstTwo) out.split = no("التقسيم متاح فقط على أول ورقتين.");
  else if (!isSplittablePair(h.cards)) out.split = no("يلزم أن تكون الورقتان متساويتين بالقيمة للتقسيم.");
  else if (rules.maxSplits === 0) out.split = no("هذه الطاولة لا تسمح بالتقسيم.");
  else if (splitsUsed >= rules.maxSplits) out.split = no(`الحد الأقصى لهذه الطاولة هو ${rules.maxSplits} تقسيمات.`);
  else if (state.hands.length >= MAX_HANDS) out.split = no("لا يمكن تجاوز خمس أيادٍ على الطاولة.");
  else if (isAcePair && h.fromSplit && !rules.resplitAces) out.split = no("إعادة تقسيم الآسات غير مسموحة هنا.");
  else if (h.stake > balance) out.split = no("الرصيد لا يكفي لتقسيم الرهان.");
  else out.split = yes;

  // SURRENDER
  if (rules.surrender === "none") out.surrender = no("الاستسلام غير متاح على هذه الطاولة.");
  else if (h.fromSplit) out.surrender = no("لا يمكن الاستسلام بعد التقسيم.");
  else if (rules.surrender === "early" && !(isFirstTwo && state.hands.length === 1))
    out.surrender = no("الاستسلام المبكر متاح فقط قبل أي إجراء آخر.");
  else if (rules.surrender === "late" && !isFirstTwo) out.surrender = no("الاستسلام المتأخر متاح على أول ورقتين فقط.");
  else out.surrender = yes;

  return out;
}

/* ----------------------------------------------------------------- dealing */

function peekDealer(state: GameState): GameState {
  if (!state.rules.holeCard || !state.rules.dealerPeek) return state;
  const bj = isBlackjack(state.dealer);
  return {
    ...state,
    holeHidden: !bj,
    dealerHasBlackjack: bj,
    notes: [...state.notes, bj ? "الموزّع أعلن البلاك جاك." : "الموزّع تحقق من الورقة المخفية: لا يوجد بلاك جاك."],
  };
}

function takeInsurance(state: GameState): GameState {
  const stake = Math.ceil(handStake(state.hands[0]!) / 2);
  return { ...state, insurance: { ...state.insurance, offered: false, stake, result: "none" } };
}

function dealCards(state: GameState, bet: number): GameState {
  let s = state;
  const hand: Hand = {
    id: makeHandId(),
    cards: [],
    stake: bet,
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
  const toPlayer = (): void => {
    const d = draw(s);
    s = d.state;
    s = { ...s, hands: [{ ...hand, cards: [...(s.hands[0]?.cards ?? []), d.card] }] };
  };
  const toDealer = (): void => {
    const d = draw(s);
    s = d.state;
    s = { ...s, dealer: [...s.dealer, d.card] };
  };

  s = { ...s, hands: [hand] };
  toPlayer();
  toDealer();
  toPlayer();
  if (s.rules.holeCard) toDealer();

  return s;
}

function startDeal(state: GameState, input: BetInput, balance: number): GameState {
  const { rules } = state;
  const bet = Math.floor(input.bet);
  if (!Number.isFinite(bet) || bet <= 0) throw new Error("ضع رهاناً صحيحاً أولاً.");
  if (bet < rules.minBet) throw new Error(`أقل رهان على هذه الطاولة هو ${rules.minBet} شيبس.`);
  if (bet > rules.maxBet) throw new Error(`أعلى رهان على هذه الطاولة هو ${rules.maxBet} شيبس.`);

  const sideBets = input.sideBets
    .filter((s) => rules.sideBets.includes(s.id) && Math.floor(s.stake) > 0)
    .map((s) => ({ id: s.id, stake: Math.floor(s.stake) }));
  const reserved = bet + sideBets.reduce((sum, s) => sum + s.stake, 0);
  if (reserved > balance) throw new Error("الرصيد المتاح لا يكفي لهذا الرهان.");

  let s: GameState = {
    ...state,
    phase: "player",
    hands: [],
    activeHand: 0,
    dealer: [],
    holeHidden: rules.holeCard,
    dealerHasBlackjack: false,
    insurance: { offered: false, stake: 0, result: "none", payout: 0 },
    sideBets,
    sideBetResults: [],
    reserved,
    returned: 0,
    notes: [],
    roundId: `r${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
  };

  s = dealCards(s, bet);

  const playerBJ = isNatural(s.hands[0]!, rules);
  const upcard = s.dealer[0]!;
  const aceUp = upcard.r === "A";
  const tenUp = isTenValue(upcard);

  // A peek game offers insurance on an ace before checking the hole card.
  if (rules.holeCard && rules.dealerPeek && aceUp && rules.insurance) {
    return { ...s, insurance: { ...s.insurance, offered: true } };
  }

  // Hole-card games peek against ace/ten upcards.
  if (rules.holeCard && rules.dealerPeek && (aceUp || tenUp)) {
    s = peekDealer(s);
    if (s.dealerHasBlackjack) return settleRound(s);
    if (playerBJ) return settleRound(s);
    return s;
  }

  // A natural is only auto-settled once the dealer's blackjack possibility is
  // known. On peek tables that already happened above; otherwise the dealer
  // must reveal/play first (the payout logic handles the push).
  if (playerBJ) return rules.holeCard && rules.dealerPeek ? settleRound(s) : finishOrDealer(s);
  return s;
}

/* --------------------------------------------------------- player progress */

function advance(state: GameState): GameState {
  const idx = state.hands.findIndex((h, i) => i > state.activeHand && !h.done && !h.bust);
  if (idx === -1) return { ...state, phase: "dealer" };
  return { ...state, activeHand: idx };
}

/** Applies a single card to the active hand and returns the new state. */
function hitActive(state: GameState, extraStake = 0): GameState {
  const d = draw(state);
  const idx = state.activeHand;
  let s: GameState = { ...d.state, reserved: state.reserved + extraStake };
  s = {
    ...s,
    hands: s.hands.map((h, i) => {
      if (i !== idx) return h;
      const cards = [...h.cards, d.card];
      const total = handValue(cards).total;
      return {
        ...h,
        cards,
        doubledStake: h.doubledStake + extraStake,
        doubled: h.doubled || extraStake > 0,
        done: total > 21 || total === 21 || extraStake > 0,
        bust: total > 21,
      };
    }),
  };
  return advance(s);
}

/* ------------------------------------------------------------ dealer + pay */

function playDealer(state: GameState): GameState {
  let s: GameState = { ...state, phase: "dealer", holeHidden: false };

  // European No Hole Card: the dealer's second card arrives only now.
  while (!s.rules.holeCard && s.dealer.length < 2) {
    const d = draw(s);
    s = { ...d.state, dealer: [...d.state.dealer, d.card] };
  }

  const liveHands = s.hands.filter((h) => !h.surrendered && !h.bust);
  if (liveHands.length === 0) return s;

  let guard = 0;
  while (dealerShouldHit(s.dealer, s.rules) && guard < 32) {
    const d = draw(s);
    s = { ...d.state, dealer: [...d.state.dealer, d.card] };
    guard++;
  }
  return s;
}

/**
 * Resolves one hand against the final dealer cards.
 * Returns the hand untouched when it is already settled (idempotent).
 */
export function settleHand(h: Hand, dealer: readonly Card[], rules: TableRules): Hand {
  if (h.settled) return h;
  const stake = handStake(h);
  const finish = (outcome: HandOutcome, payout: number): Hand => {
    const rounded = Math.round(payout * 100) / 100;
    return {
      ...h,
      settled: true,
      done: true,
      outcome,
      payout: rounded,
      net: Math.round((rounded - stake) * 100) / 100,
    };
  };

  if (h.surrendered) return finish("surrender", stake / 2);

  const pv = handValue(h.cards);
  const dv = handValue(dealer);
  const dealerBJ = dealer.length === 2 && isBlackjack(dealer);
  const playerBJ = isNatural(h, rules);

  if (pv.total > 21) return finish("bust", 0);
  if (playerBJ) return dealerBJ ? finish("push", stake) : finish("blackjack", stake * (1 + rules.blackjackPayout));
  if (dealerBJ) return finish("lose", 0);
  if (dv.total > 21) return finish("dealer_bust", stake * 2);
  if (pv.total > dv.total) return finish("win", stake * 2);
  if (pv.total < dv.total) return finish("lose", 0);
  return finish("push", stake);
}

function settleRound(state: GameState): GameState {
  let s = state;

  if (s.insurance.stake > 0 && s.insurance.result === "none") {
    const dealerBJ = s.dealer.length === 2 && isBlackjack(s.dealer);
    s = {
      ...s,
      insurance: dealerBJ
        ? { ...s.insurance, result: "win", payout: s.insurance.stake * 3 }
        : { ...s.insurance, result: "lose", payout: 0 },
    };
  }

  const hands = s.hands.map((h) => settleHand(h, s.dealer, s.rules));
  const first = hands[0];
  const sideBetResults = s.sideBets.map((b) =>
    settleSideBet(b.id, b.stake, first?.cards ?? [], s.dealer[0] ?? null),
  );

  const returned =
    hands.reduce((sum, h) => sum + h.payout, 0) +
    (s.insurance.result === "win" ? s.insurance.payout : 0) +
    sideBetResults.reduce((sum, r) => sum + r.payout, 0);

  return {
    ...s,
    phase: "settled",
    hands,
    holeHidden: false,
    sideBetResults,
    returned: Math.round(returned * 100) / 100,
  };
}

function finishOrDealer(state: GameState): GameState {
  const dealt = playDealer(state);
  return settleRound(dealt);
}

/** Plays the dealer and settles. Exposed for the UI's reveal step. */
export function finishRound(state: GameState): GameState {
  return finishOrDealer(state);
}

/* ---------------------------------------------------------------- reducer */

/**
 * The only mutation entry point. Illegal actions throw an Error carrying a
 * friendly Arabic explanation so the UI can surface it verbatim.
 */
export function reducer(state: GameState, action: Action, balance = Number.POSITIVE_INFINITY): GameState {
  switch (action.type) {
    case "deal": {
      const dealt = startDeal(state, action.bet, action.balance);
      // An ace upcard + peek table waits for the insurance answer first.
      if (awaitingInsurance(dealt)) return dealt;
      return dealt;
    }

    case "insurance": {
      const moves = legalMoves(state, balance);
      if (!moves.insurance.allowed) throw new Error(moves.insurance.reason ?? "التأمين غير متاح الآن.");
      // Declining (or accepting) always triggers the dealer's peek in peek games.
      let s = state;
      if (action.take) {
        s = takeInsurance(s);
        s = { ...s, reserved: s.reserved + s.insurance.stake };
      } else {
        s = { ...s, insurance: { ...s.insurance, offered: false } };
      }
      const before = s;
      s = peekDealer(s);
      if (s.dealerHasBlackjack) return settleRound(s);
      // No dealer blackjack: insurance is lost immediately.
      if (before.insurance.stake > 0) s = { ...s, insurance: { ...s.insurance, result: "lose", payout: 0 } };
      if (s.hands[0] && isNatural(s.hands[0]!, s.rules)) return settleRound(s);
      return s;
    }

    case "evenMoney": {
      const moves = legalMoves(state, balance);
      if (!moves.evenMoney.allowed) throw new Error(moves.evenMoney.reason ?? "المال المتساوي غير متاح الآن.");
      const h = state.hands[0]!;
      const stake = handStake(h);
      const paid: Hand = {
        ...h,
        settled: true,
        done: true,
        outcome: "win",
        payout: stake * 2,
        net: stake,
      };
      const sideBetResults = state.sideBets.map((b) =>
        settleSideBet(b.id, b.stake, h.cards, state.dealer[0] ?? null),
      );
      return {
        ...state,
        phase: "settled",
        holeHidden: false,
        insurance: { offered: false, stake: 0, result: "none", payout: 0 },
        hands: [paid],
        sideBetResults,
        notes: [...state.notes, "المال المتساوي: دُفع الرهان ١:١ بدلاً من المجازفة."],
        returned: paid.payout + sideBetResults.reduce((sum, r) => sum + r.payout, 0),
      };
    }

    case "hit": {
      const moves = legalMoves(state, balance);
      if (!moves.hit.allowed) throw new Error(moves.hit.reason ?? "لا يمكن سحب ورقة الآن.");
      const s = hitActive(state);
      if (s.phase === "dealer") return finishOrDealer(s);
      return s;
    }

    case "stand": {
      const moves = legalMoves(state, balance);
      if (!moves.stand.allowed) throw new Error(moves.stand.reason ?? "لا يمكن التوقف الآن.");
      let s: GameState = {
        ...state,
        hands: state.hands.map((h, i) => (i === state.activeHand ? { ...h, done: true } : h)),
      };
      s = advance(s);
      if (s.phase === "dealer") return finishOrDealer(s);
      return s;
    }

    case "double": {
      const moves = legalMoves(state, balance);
      if (!moves.double.allowed) throw new Error(moves.double.reason ?? "لا يمكن المضاعفة الآن.");
      const h = activeHand(state)!;
      const s = hitActive(state, h.stake);
      if (s.phase === "dealer") return finishOrDealer(s);
      return s;
    }

    case "split": {
      const moves = legalMoves(state, balance);
      if (!moves.split.allowed) throw new Error(moves.split.reason ?? "لا يمكن التقسيم الآن.");
      const h = activeHand(state)!;
      const isAces = h.cards[0]!.r === "A" && h.cards[1]!.r === "A";
      const left: Hand = {
        ...h,
        id: makeHandId(),
        cards: [h.cards[0]!],
        fromSplit: true,
        splitAces: isAces,
        doubled: false,
        doubledStake: 0,
        done: false,
        bust: false,
      };
      const right: Hand = {
        ...h,
        id: makeHandId(),
        cards: [h.cards[1]!],
        fromSplit: true,
        splitAces: isAces,
        doubled: false,
        doubledStake: 0,
        done: false,
        bust: false,
      };
      const hands = [...state.hands];
      hands.splice(state.activeHand, 1, left, right);

      let s: GameState = { ...state, hands, reserved: state.reserved + h.stake };

      const dealTo = (idx: number) => {
        const d = draw(s);
        s = {
          ...d.state,
          hands: d.state.hands.map((x, i) => (i === idx ? { ...x, cards: [...x.cards, d.card] } : x)),
        };
      };
      dealTo(state.activeHand);
      dealTo(state.activeHand + 1);

      if (isAces && !state.rules.hitSplitAces) {
        s = { ...s, hands: s.hands.map((x) => (x.splitAces ? { ...x, done: true } : x)) };
        const nextIdx = s.hands.findIndex((x) => !x.done && !x.bust);
        if (nextIdx === -1) return finishOrDealer(s);
        return { ...s, activeHand: nextIdx };
      }
      return s;
    }

    case "surrender": {
      const moves = legalMoves(state, balance);
      if (!moves.surrender.allowed) throw new Error(moves.surrender.reason ?? "لا يمكن الاستسلام الآن.");
      const s: GameState = {
        ...state,
        hands: state.hands.map((h, i) =>
          i === state.activeHand ? { ...h, surrendered: true, done: true } : h,
        ),
      };
      return finishOrDealer(s);
    }

    case "reveal":
      // Advances a dealer-phase state to settlement (used by the UI).
      return state.phase === "dealer" ? finishOrDealer(state) : state;

    case "next":
      return createState(state.rules);

    default:
      return state;
  }
}
