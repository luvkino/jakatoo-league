// ============================================================================
// BLACKJACK — pure offline game engine (no DOM, no React, no network).
// Standard 52-card deck, Fisher-Yates shuffle, dealer stands on all 17s,
// natural blackjack pays 3:2. Virtual chips only — no real-money anything.
// ============================================================================

export type Suit = "S" | "H" | "D" | "C";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  r: Rank;
  s: Suit;
  /** unique per deck instance — safe React keys */
  id: string;
}

const RANKS: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: readonly Suit[] = ["S", "H", "D", "C"];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ r, s, id: `${r}${s}` });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle on a copy (never mutates the input). */
export function shuffleDeck(deck: readonly Card[]): Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  // re-id so React keys stay unique across reshuffles within one session
  return out.map((c, i) => ({ ...c, id: `${c.id}#${i}` }));
}

function cardValue(r: Rank): number {
  if (r === "A") return 11;
  if (r === "K" || r === "Q" || r === "J" || r === "10") return 10;
  return Number(r);
}

export interface HandValue {
  total: number;
  /** true when an ace is still counted as 11 */
  soft: boolean;
}

/** Correct Blackjack scoring with ace reduction. */
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c.r);
    if (c.r === "A") aces++;
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
    soft = aces > 0;
  }
  return { total, soft };
}

/** Two cards totalling exactly 21. */
export function isNatural(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

/** House rule: dealer draws until reaching at least 17 (stands on soft 17). */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  return handValue(cards).total < 17;
}

export type BjOutcome = "natural" | "win" | "lose" | "push" | "player_bust" | "dealer_bust";

/** Profit multiplier applied to the bet. */
export function payoutMultiplier(outcome: BjOutcome): number {
  switch (outcome) {
    case "natural":
      return 1.5;
    case "win":
    case "dealer_bust":
      return 1;
    case "push":
      return 0;
    case "lose":
    case "player_bust":
      return -1;
  }
}

/** Resolve a finished round (both hands final) into an outcome. */
export function resolveRound(playerCards: readonly Card[], dealerCards: readonly Card[]): BjOutcome {
  const p = handValue(playerCards).total;
  const d = handValue(dealerCards).total;
  const pNatural = isNatural(playerCards);
  const dNatural = isNatural(dealerCards);
  if (p > 21) return "player_bust";
  if (d > 21) return "dealer_bust";
  if (pNatural && dNatural) return "push";
  if (pNatural) return "natural";
  if (dNatural) return "lose";
  if (p > d) return "win";
  if (p < d) return "lose";
  return "push";
}

// ---------------------------------------------------------------------------
// Persisted (browser-local) stats
// ---------------------------------------------------------------------------

export interface BlackjackStats {
  chips: number;
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  naturals: number;
  streak: number;
  bestStreak: number;
}

export const STARTING_CHIPS = 1000;
export const MIN_BET = 10;

export function newBlackjackStats(): BlackjackStats {
  return {
    chips: STARTING_CHIPS,
    rounds: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    naturals: 0,
    streak: 0,
    bestStreak: 0,
  };
}

/** Pure reducer applying a finished round to the stats. */
export function applyRound(
  stats: BlackjackStats,
  bet: number,
  outcome: BjOutcome,
): BlackjackStats {
  const mult = payoutMultiplier(outcome);
  const won = mult > 0;
  const next: BlackjackStats = {
    ...stats,
    chips: Math.max(0, Math.round(stats.chips + bet * mult)),
    rounds: stats.rounds + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (mult < 0 ? 1 : 0),
    pushes: stats.pushes + (mult === 0 ? 1 : 0),
    naturals: stats.naturals + (outcome === "natural" ? 1 : 0),
    streak: won ? stats.streak + 1 : 0,
  };
  next.bestStreak = Math.max(stats.bestStreak, next.streak);
  return next;
}

/**
 * Which secret achievements did this round earn (given stats BEFORE the round
 * and the round result)? Pure — the store decides what is actually new.
 */
export function roundAchievements(
  outcome: BjOutcome,
  playerCards: readonly Card[],
  statsBefore: BlackjackStats,
): string[] {
  const earned: string[] = [];
  if (statsBefore.rounds === 0) earned.push("first_blackjack");
  const hit21 =
    playerCards.length >= 3 &&
    handValue(playerCards).total === 21 &&
    outcome !== "player_bust";
  if (hit21) earned.push("lucky_21");
  if (outcome === "dealer_bust") earned.push("dealer_destroyer");
  const streakAfter = outcome === "lose" || outcome === "player_bust" ? 0 : statsBefore.streak + 1;
  if (streakAfter >= 5 && statsBefore.streak < 5) earned.push("streak_5");
  return earned;
}
