/**
 * CASINO — cards, shoe and hand scoring.
 *
 * Pure, dependency-free helpers shared by the rules engine, the UI and the
 * deterministic tests. Nothing in this module knows about React, the DOM,
 * the network or the league database.
 */

export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export const RANKS: readonly Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export const SUITS: readonly Suit[] = ["S", "H", "D", "C"];

export const SUIT_RED: Record<Suit, boolean> = { S: false, H: true, D: true, C: false };

export const SUIT_NAME_AR: Record<Suit, string> = {
  S: "بستوني",
  H: "قلوب",
  D: "ماسي",
  C: "سكوب",
};

export const SUIT_GLYPH: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

export interface Card {
  r: Rank;
  s: Suit;
  /** Unique per shoe — safe React key and stable tests. */
  id: string;
}

/** Deterministic PRNG (mulberry32). Same seed ⇒ same shoe ⇒ repeatable tests. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SUPPORTED_DECKS = [1, 2, 4, 6, 8] as const;
export type DeckCount = (typeof SUPPORTED_DECKS)[number];

export function isDeckCount(n: unknown): n is DeckCount {
  return typeof n === "number" && (SUPPORTED_DECKS as readonly number[]).includes(n);
}

/** Ordered single deck (test fixtures rely on this order). */
export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s, id: `${r}${s}` });
  return deck;
}

/** Ordered multi-deck shoe; ids stay unique across decks. */
export function freshShoe(decks: DeckCount): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const c of freshDeck()) shoe.push({ ...c, id: `${c.id}#${d}` });
  }
  return shoe;
}

/** Fisher–Yates on a copy — never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function cardValue(r: Rank): number {
  if (r === "A") return 11;
  if (r === "K" || r === "Q" || r === "J" || r === "10") return 10;
  return Number(r);
}

export interface HandValue {
  /** Best total ≤ 21 when possible (ace reduction applied). */
  total: number;
  /** True when an ace is still counted as 11. */
  soft: boolean;
  /** Hard total (every ace counted as 1). */
  hard: number;
  /** Number of aces in the hand. */
  aces: number;
}

/** Correct Blackjack scoring: multiple aces, soft/hard, never above 21 unless bust. */
export function handValue(cards: readonly Card[]): HandValue {
  let hard = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === "A") {
      aces++;
      hard += 1;
    } else {
      hard += cardValue(c.r);
    }
  }
  let total = hard;
  let upgraded = 0;
  while (total + 10 <= 21 && upgraded < aces) {
    total += 10;
    upgraded++;
  }
  // The hand is "soft" while at least one ace is still counted as 11.
  return { total, soft: upgraded > 0, hard, aces };
}

/** Two-card 21 (an ace + a ten-value card). */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && cardValue(cards[0]!.r) === cardValue(cards[1]!.r);
}

/** Ace+ten-value cards are not a "ten pair" for splitting purposes. */
export function isSplittablePair(cards: readonly Card[]): boolean {
  return (
    cards.length === 2 &&
    (cards[0]!.r === cards[1]!.r ||
      (cardValue(cards[0]!.r) === 10 && cardValue(cards[1]!.r) === 10 && cards[0]!.r !== "A"))
  );
}

export function cardsToString(cards: readonly Card[]): string {
  return cards.map((c) => `${c.r}${SUIT_GLYPH[c.s]}`).join(" ");
}
