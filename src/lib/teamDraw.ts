/**
 * TEAM SPLITTER (تقسيم الفرق 🃏) — genuine, transparent card distribution.
 *
 * Fairness contract (do not weaken):
 *  • A real standard 52-card deck is generated (4 suits × 13 ranks).
 *  • It is shuffled exactly once with Fisher–Yates, driven by
 *    `crypto.getRandomValues()` with rejection sampling (no modulo bias).
 *    The insecure platform random API is never used in this module.
 *  • Cards are dealt sequentially from the top of that shuffled deck,
 *    one card per player, in player order. Nothing is re-drawn, replaced,
 *    reshuffled or "corrected" afterwards — the dealt cards are frozen.
 *  • Teams are a pure function of the dealt cards: players sharing a rank
 *    are teammates. Team sizes are whatever the cards produced; they are
 *    never balanced by moving players or changing cards.
 *
 * This module is pure (no React/DOM) so the whole distribution can be
 * unit-tested deterministically by injecting a random-index source.
 */

import {
  freshDeck,
  RANKS,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from "./casino/cards";

export { RANKS, SUITS };
export type { Card, Rank, Suit };

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

/** Animation timing (ms) — kept inside the ranges required by the design. */
export const TEAM_DRAW_TIMING = {
  shuffleMs: 1900, // 1.5–2.5 s
  moveMs: 560, // 400–700 ms card travel
  flipMs: 320, // 250–400 ms flip on landing
  pauseMs: 450, // 350–600 ms between cards
  discoveryMs: 1500, // pause + matching-rank highlight before results
} as const;

/* ------------------------------------------------------- secure randomness */

/** Source of unsigned 32-bit values. Defaults to the CSPRNG below. */
export type Uint32Source = () => number;

export function cryptoUint32(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/**
 * Unbiased random integer in [0, bound) from a uint32 source.
 *
 * Rejection sampling: values in the incomplete final block
 * [limit, 2^32) are discarded, so every residue class mod `bound`
 * is equally likely (no modulo bias).
 */
export function secureRandomIndex(bound: number, nextUint32: Uint32Source = cryptoUint32): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > 0x100000000) {
    throw new RangeError(`secureRandomIndex: bound must be an integer in [1, 2^32], got ${bound}`);
  }
  if (bound === 1) return 0;
  const limit = Math.floor(0x100000000 / bound) * bound;
  let value = nextUint32();
  while (value >= limit) value = nextUint32();
  return value % bound;
}

/** A random-index function (bound) => j in [0, bound). Injectable for tests. */
export type RandomIndexFn = (bound: number) => number;

export const secureRandomIndexFn: RandomIndexFn = (bound) => secureRandomIndex(bound);

/* ------------------------------------------------------------------- deck */

/** A real standard 52-card deck: every suit × every rank, exactly once. */
export function createStandardDeck(): Card[] {
  return freshDeck();
}

/**
 * Fisher–Yates shuffle on a copy of `deck` (input never mutated).
 * For i from last down to 1, j is drawn uniformly from [0, i].
 */
export function shuffleDeck(
  deck: readonly Card[],
  randomIndex: RandomIndexFn = secureRandomIndexFn,
): Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) {
      throw new RangeError(`shuffleDeck: random index ${j} out of range [0, ${i}]`);
    }
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Fresh 52-card deck, shuffled once with the secure source by default. */
export function createShuffledDeck(randomIndex: RandomIndexFn = secureRandomIndexFn): Card[] {
  return shuffleDeck(createStandardDeck(), randomIndex);
}

/* ------------------------------------------------------------- distribution */

export interface DealtCard {
  /** 0-based position in the shuffled deck / deal order. */
  drawIndex: number;
  playerId: string;
  /** The actual card taken from the shuffled deck. Frozen — never changes. */
  card: Card;
}

export function validatePlayerCount(count: number): void {
  if (!Number.isInteger(count) || count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new RangeError(
      `team draw needs ${MIN_PLAYERS}–${MAX_PLAYERS} players, got ${count}`,
    );
  }
}

/**
 * Deal one card per player, in player order, sequentially from the top of
 * the (already shuffled) deck: deck[0] → player 1, deck[1] → player 2, …
 * The deck is not mutated and dealt entries are frozen so a revealed card
 * can never be changed afterwards.
 */
export function dealDistribution(deck: readonly Card[], playerIds: readonly string[]): DealtCard[] {
  validatePlayerCount(playerIds.length);
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("team draw: duplicate player id");
  }
  if (deck.length < playerIds.length) {
    throw new Error(`team draw: deck has ${deck.length} cards for ${playerIds.length} players`);
  }
  return playerIds.map((playerId, i) =>
    Object.freeze({ drawIndex: i, playerId, card: deck[i]! }),
  );
}

/**
 * The exact animation plan: one step per dealt card, in draw order.
 * The UI must animate precisely this sequence — step i shows deck[i]
 * travelling to playerIds[i]. Nothing may be added, removed or reordered.
 */
export interface AnimationStep {
  stepIndex: number;
  playerId: string;
  cardId: string;
}

export function planAnimationSequence(dealt: readonly DealtCard[]): AnimationStep[] {
  return dealt.map((d, i) => {
    if (d.drawIndex !== i) throw new Error("animation plan: draw sequence is not sequential");
    return { stepIndex: i, playerId: d.playerId, cardId: d.card.id };
  });
}

/* ------------------------------------------------------------ team building */

export interface RankGroup {
  rank: Rank;
  /** Players holding this rank, in deal order. */
  members: DealtCard[];
  /** A team needs at least two matching ranks. */
  isTeam: boolean;
}

/** Group dealt cards purely by rank (first-appearance order). */
export function groupByRank(dealt: readonly DealtCard[]): RankGroup[] {
  const byRank = new Map<Rank, DealtCard[]>();
  for (const d of dealt) {
    const list = byRank.get(d.card.r);
    if (list) list.push(d);
    else byRank.set(d.card.r, [d]);
  }
  return [...byRank.entries()].map(([rank, members]) => ({
    rank,
    members,
    isTeam: members.length >= 2,
  }));
}

export type TwoTeamStatus =
  /** Exactly two ranks appeared and every player matched: two real teams. */
  | "two-teams"
  /** Some matches, but not exactly two teams (extra ranks / lone players). */
  | "partial-matches"
  /** Every player drew a different rank: no team could form. */
  | "no-matches";

export interface TwoTeamEvaluation {
  status: TwoTeamStatus;
  groups: RankGroup[];
  /** Groups of ≥2 that genuinely form a team. */
  teams: RankGroup[];
  /** Players whose rank nobody else drew. */
  unmatched: DealtCard[];
  distinctRanks: number;
  playerCount: number;
  /** Two *equal* teams are arithmetically possible only for even counts. */
  equalSplitPossible: boolean;
  /** True only when the cards themselves produced exactly two full teams. */
  formsTwoTeams: boolean;
}

/**
 * Evaluate a finished distribution for the default two-team mode.
 * This never "fixes" anything — it only reports what the cards produced.
 */
export function evaluateTwoTeams(dealt: readonly DealtCard[]): TwoTeamEvaluation {
  const groups = groupByRank(dealt);
  const teams = groups.filter((g) => g.isTeam);
  const unmatched = groups.filter((g) => !g.isTeam).flatMap((g) => g.members);
  const formsTwoTeams = groups.length === 2 && teams.length === 2 && unmatched.length === 0;
  return {
    status: formsTwoTeams ? "two-teams" : teams.length > 0 ? "partial-matches" : "no-matches",
    groups,
    teams,
    unmatched,
    distinctRanks: groups.length,
    playerCount: dealt.length,
    equalSplitPossible: dealt.length % 2 === 0,
    formsTwoTeams,
  };
}
