/**
 * CASINO — side bets (independent of the main hand).
 *
 * Payouts are the industry-standard published tables. `to` expresses the
 * **total return per 1 chip staked** (so `to: 10` = "9 to 1"). Nothing is
 * hidden: the UI renders exactly the numbers in `SIDE_BET_PAYTABLE`.
 *
 * Settlement is pure and deterministic, which is what the unit tests drive.
 */

import { handValue, isPair, type Card, type Suit } from "./cards";

export const SIDE_BET_IDS = ["perfectPairs", "twentyOnePlusThree", "luckyLadies", "royalMatch"] as const;
export type SideBetId = (typeof SIDE_BET_IDS)[number];

export const SIDE_BET_LABEL_AR: Record<SideBetId, string> = {
  perfectPairs: "الأزواج المثالية",
  twentyOnePlusThree: "21+3",
  luckyLadies: "السيدات المحظوظات",
  royalMatch: "المطابقة الملكية",
};

export const SIDE_BET_LABEL_EN: Record<SideBetId, string> = {
  perfectPairs: "Perfect Pairs",
  twentyOnePlusThree: "21+3",
  luckyLadies: "Lucky Ladies",
  royalMatch: "Royal Match",
};

export const SIDE_BET_DESC_AR: Record<SideBetId, string> = {
  perfectPairs: "تراهن على أول ورقتين لك: زوج مثالي (نفس الرتبة والرمز)، زوج بلون واحد، أو زوج مختلط.",
  twentyOnePlusThree: "تُدمج ورقتاك مع ورقة الموزّع المكشوفة لتكوين ثلاثة أوراق: ثلاثية، Straight Flush، Straight، أو Flush.",
  luckyLadies: "تُدفع على مجموع ٢٠ بزوج من السيدات (Q) من نفس الرمز، وترتفع الجوائز عندما تكون أوراقك كلها سيدات.",
  royalMatch: "تراهن على أن أول ورقتين لك من نفس الرمز، ويدفع أعلى إذا كانتا ملكاً (K) وملكة (Q).",
};

export interface SideBetTier {
  key: string;
  label: string;
  /** Total return per 1 staked (stake included). */
  to: number;
  note?: string;
}

export interface SideBetDef {
  id: SideBetId;
  label: string;
  labelEn: string;
  desc: string;
  paytable: SideBetTier[];
}

export const SIDE_BET_PAYTABLE: Record<SideBetId, SideBetTier[]> = {
  perfectPairs: [
    { key: "perfect", label: "زوج مثالي (نفس الرتبة ونفس الرمز)", to: 25 },
    { key: "colored", label: "زوج بلون واحد (نفس الرتبة، رموز بنفس اللون)", to: 12 },
    { key: "mixed", label: "زوج مختلط (نفس الرتبة، رموز مختلفة)", to: 6 },
  ],
  twentyOnePlusThree: [
    { key: "suitedTrips", label: "ثلاثية بنفس الرمز", to: 100 },
    { key: "straightFlush", label: "Straight Flush", to: 40 },
    { key: "trips", label: "ثلاثية بأوراق مختلفة الرموز", to: 30 },
    { key: "straight", label: "Straight", to: 10 },
    { key: "flush", label: "Flush", to: 5 },
  ],
  luckyLadies: [
    { key: "queenHeartsPair", label: "زوج سيدات القلوب (Q♥ + Q♥)", to: 125 },
    { key: "matchedTwenty", label: "مجموع ٢٠ من سيدتين بنفس الرمز", to: 19 },
    { key: "twenty", label: "مجموع ٢٠ بأي ورقتين", to: 1 },
  ],
  royalMatch: [
    { key: "royal", label: "ملك وملكة بنفس الرمز", to: 25 },
    { key: "match", label: "أول ورقتين بنفس الرمز", to: 5 },
  ],
};

export const SIDE_BETS: SideBetDef[] = SIDE_BET_IDS.map((id) => ({
  id,
  label: SIDE_BET_LABEL_AR[id],
  labelEn: SIDE_BET_LABEL_EN[id],
  desc: SIDE_BET_DESC_AR[id],
  paytable: SIDE_BET_PAYTABLE[id],
}));

export interface SideBetResult {
  id: SideBetId;
  /** Stake placed by the player. */
  stake: number;
  /** Matched tier key, or null when the bet loses. */
  tier: string | null;
  /** Total returned (stake + winnings), 0 on a loss. */
  payout: number;
  /** payout − stake. */
  net: number;
  label: string;
}

export const SIDE_BET_NOT_PLAYED = "لم تُلعب";

/* ------------------------------------------------------------------ helpers */

const rankIndex = (r: string): number => {
  const order = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  return order.indexOf(r);
};

const suitColor = (s: Suit): "red" | "black" => (s === "H" || s === "D" ? "red" : "black");

/** A 3-card straight (ace may play high or low; no wraparound). */
function isThreeStraight(a: Card, b: Card, c: Card): boolean {
  const idx = [a, b, c].map((x) => rankIndex(x.r)).sort((x, y) => x - y);
  // ace-low: A,2,3 → indices 12,0,1
  const aceLow = idx.map((i) => (i === 12 ? -1 : i)).sort((x, y) => x - y);
  const straight = (list: number[]) => list[1] === list[0]! + 1 && list[2] === list[0]! + 2;
  return straight(idx) || straight(aceLow);
}

/**
 * Settles one side bet against the round's cards.
 * `player` = the player's first two cards, `dealerUp` = dealer upcard.
 */
export function settleSideBet(
  id: SideBetId,
  stake: number,
  player: readonly Card[],
  dealerUp: Card | null,
): SideBetResult {
  const s = Math.max(0, Math.floor(stake));
  const base: SideBetResult = {
    id,
    stake: s,
    tier: null,
    payout: 0,
    net: -s,
    label: SIDE_BET_NOT_PLAYED,
  };
  if (s <= 0) return { ...base, label: SIDE_BET_NOT_PLAYED };
  if (player.length < 2) return { ...base, net: 0, payout: s, label: "لم تكتمل الجولة" };

  const pay = (tier: SideBetTier): SideBetResult => ({
    id,
    stake: s,
    tier: tier.key,
    payout: t_round(s * tier.to),
    net: t_round(s * tier.to) - s,
    label: tier.label,
  });

  const [a, b] = [player[0]!, player[1]!];

  if (id === "perfectPairs") {
    if (!isPair([a, b])) return base;
    const tiers = SIDE_BET_PAYTABLE.perfectPairs;
    if (a.s === b.s) return pay(tiers[0]!);
    if (suitColor(a.s) === suitColor(b.s)) return pay(tiers[1]!);
    return pay(tiers[2]!);
  }

  if (id === "twentyOnePlusThree") {
    if (!dealerUp) return { ...base, net: 0, payout: s, label: "لم تكتمل الجولة" };
    const cards = [a, b, dealerUp];
    const tiers = SIDE_BET_PAYTABLE.twentyOnePlusThree;
    const sameRank = cards.every((c) => c.r === cards[0]!.r);
    const sameSuit = cards.every((c) => c.s === cards[0]!.s);
    if (sameRank && sameSuit) return pay(tiers[0]!);
    if (sameSuit && isThreeStraight(a, b, dealerUp)) return pay(tiers[1]!);
    if (sameRank) return pay(tiers[2]!);
    if (isThreeStraight(a, b, dealerUp)) return pay(tiers[3]!);
    if (sameSuit) return pay(tiers[4]!);
    return base;
  }

  if (id === "luckyLadies") {
    // Only the player's first two cards count, exactly as on a real table.
    const { total } = handValue([a, b]);
    if (total !== 20) return base;
    const tiers = SIDE_BET_PAYTABLE.luckyLadies;
    const queenPair = a.r === "Q" && b.r === "Q";
    if (queenPair && a.s === "H" && b.s === "H") return pay(tiers[0]!);
    if (queenPair && suitColor(a.s) === suitColor(b.s)) return pay(tiers[1]!);
    return pay(tiers[2]!);
  }

  // royalMatch
  const tiers = SIDE_BET_PAYTABLE.royalMatch;
  if (a.s !== b.s) return base;
  const isRoyal =
    (a.r === "K" && b.r === "Q") || (a.r === "Q" && b.r === "K");
  if (isRoyal) return pay(tiers[0]!);
  return pay(tiers[1]!);
}

function t_round(n: number): number {
  return Math.round(n * 100) / 100;
}
