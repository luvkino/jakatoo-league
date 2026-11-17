/**
 * TEAM SPLITTER (تقسيم الفرق 🃏) — genuine, transparent card distribution.
 *
 * Fairness contract (do not weaken):
 *  • A real standard 52-card deck is generated (4 suits × 13 ranks).
 *  • It is shuffled exactly once with Fisher–Yates, driven by
 *    `crypto.getRandomValues()` with rejection sampling (no modulo bias).
 *    The insecure platform random API is never used in this module.
 *  • Cards are dealt face-up, one at a time, sequentially from the top of
 *    that shuffled deck to exactly four players. Nothing is re-drawn,
 *    replaced, reshuffled or "corrected" afterwards — dealt cards freeze.
 *  • A team forms the moment a dealt card's rank matches a rank already
 *    held by a *different*, still-unassigned player (never oneself).
 *    Assigned players stop receiving cards; dealing continues to the
 *    remaining players until the second team forms or the deck runs out.
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

/** The team splitter is a four-player card table: exactly 4 players. */
export const REQUIRED_PLAYERS = 4;

/** Fast animation timing (ms) — inside the ranges required by the design. */
export const TEAM_DRAW_TIMING = {
  shuffleMs: 850, // 700–1000 ms
  moveMs: 250, // 200–300 ms card travel
  flipMs: 180, // 150–200 ms flip on landing
  pauseMs: 125, // 100–150 ms between cards
  discoveryMs: 900, // quick, clear team-match discovery highlight
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
  if (!Number.isInteger(count) || count !== REQUIRED_PLAYERS) {
    throw new RangeError(
      `team split needs exactly ${REQUIRED_PLAYERS} players, got ${count}`,
    );
  }
}

export interface FormedTeam {
  /** The matching rank that formed this team (rank only — suit ignored). */
  rank: Rank;
  /** The two teammates, in original player order. A player never teams with themselves. */
  playerIds: [string, string];
  /** Ids of the two matching cards (the held card and the card just dealt). */
  cardIds: [string, string];
  /** Draw index of the card that completed the match. */
  formedAtDrawIndex: number;
}

export interface TeamDrawResult {
  /** Every card dealt, in exact draw order (deck[0], deck[1], …). */
  dealt: DealtCard[];
  /** Teams in the order they were formed (0, 1 or 2 of them). */
  teams: FormedTeam[];
  /** "complete" when both teams formed, "exhausted" when the deck ran out. */
  status: "complete" | "exhausted";
  cardsUsed: number;
}

/**
 * Simulate one genuine team draw over an already-shuffled deck.
 *
 * Dealing rotates through the still-unassigned players in player order.
 * After each card, if its rank matches any card held by a DIFFERENT
 * unassigned player, those two form a team immediately and stop receiving
 * cards (matching one's own cards never counts). The deck is consumed
 * strictly from the top; it is never reshuffled or manipulated mid-draw.
 */
export function simulateTeamDraw(
  deck: readonly Card[],
  playerIds: readonly string[],
): TeamDrawResult {
  validatePlayerCount(playerIds.length);
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("team draw: duplicate player id");
  }
  const held = new Map<string, DealtCard[]>(playerIds.map((id) => [id, []]));
  const unassigned = new Set(playerIds);
  const dealt: DealtCard[] = [];
  const teams: FormedTeam[] = [];
  let current = 0; // index into playerIds

  const nextUnassignedAfter = (idx: number): number => {
    for (let step = 1; step <= playerIds.length; step++) {
      const cand = (idx + step) % playerIds.length;
      if (unassigned.has(playerIds[cand]!)) return cand;
    }
    return idx;
  };

  for (let drawIndex = 0; drawIndex < deck.length && unassigned.size > 0; drawIndex++) {
    const playerId = playerIds[current]!;
    const entry: DealtCard = Object.freeze({ drawIndex, playerId, card: deck[drawIndex]! });
    dealt.push(entry);
    held.get(playerId)!.push(entry);

    // Rank-only match against a different, still-unassigned player.
    const partner = playerIds.find(
      (other) =>
        other !== playerId &&
        unassigned.has(other) &&
        held.get(other)!.some((h) => h.card.r === entry.card.r),
    );
    if (partner) {
      const heldMatch = held.get(partner)!.find((h) => h.card.r === entry.card.r)!;
      const ordered = [...playerIds].filter((id) => id === partner || id === playerId);
      teams.push(
        Object.freeze({
          rank: entry.card.r,
          playerIds: [ordered[0]!, ordered[1]!] as [string, string],
          cardIds: [heldMatch.card.id, entry.card.id] as [string, string],
          formedAtDrawIndex: drawIndex,
        }),
      );
      unassigned.delete(partner);
      unassigned.delete(playerId);
      if (unassigned.size === 0) break;
    }
    current = nextUnassignedAfter(current);
  }

  return { dealt, teams, status: teams.length === 2 ? "complete" : "exhausted", cardsUsed: dealt.length };
}

/**
 * The exact animation plan: one step per dealt card, in draw order.
 * The UI must animate precisely this sequence — step i shows deck[i]
 * travelling to its player. Nothing may be added, removed or reordered,
 * and skipping the animation reveals this same sequence's result.
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
