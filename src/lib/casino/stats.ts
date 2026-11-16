/**
 * CASINO — statistics & round history (pure).
 *
 * Everything is derived from the actual stored game records: if a number is
 * not computable from `CasinoRoundRecord[]`, it does not exist here.
 */

import type { HandOutcome } from "./engine";
import type { SideBetId, SideBetResult } from "./sideBets";
import { SIDE_BET_LABEL_AR } from "./sideBets";
import type { TableId } from "./tables";
import { TABLE_MAP } from "./tables";

export interface CasinoRoundRecord {
  id: string;
  at: number;
  tableId: TableId;
  practice: boolean;
  /** Chips at risk for the round (all stakes). */
  reserved: number;
  /** Gross chips returned. */
  returned: number;
  net: number;
  /** Balance after the round. */
  balance: number;
  hands: {
    outcome: HandOutcome | null;
    stake: number;
    net: number;
    cards: string;
    total: number;
    dealerCards: string;
    dealerTotal: number;
  }[];
  sideBets: SideBetResult[];
  insurance: { stake: number; result: "win" | "lose" | "none"; payout: number };
  primaryOutcome: HandOutcome | null;
}

export interface CasinoStats {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  /** percentage 0..100 */
  winRate: number;
  blackjackRate: number;
  averageBet: number;
  largestWin: number;
  largestLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  sessionNet: number;
  grossStaked: number;
  grossReturned: number;
  byTable: {
    tableId: TableId;
    name: string;
    rounds: number;
    net: number;
    winRate: number;
  }[];
  sideBets: {
    id: SideBetId;
    name: string;
    wagers: number;
    hits: number;
    staked: number;
    net: number;
  }[];
}

const winOutcomes: HandOutcome[] = ["win", "blackjack", "dealer_bust"];
const loseOutcomes: HandOutcome[] = ["lose", "bust", "surrender"];

/** A round is a "win" when its net chip movement is positive. */
export function roundIsWin(r: CasinoRoundRecord): boolean {
  return r.net > 0;
}
export function roundIsLoss(r: CasinoRoundRecord): boolean {
  return r.net < 0;
}

export function computeCasinoStats(records: readonly CasinoRoundRecord[]): CasinoStats {
  const settled = records.filter((r) => r.hands.some((h) => h.outcome !== null));
  const rounds = settled.length;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let blackjacks = 0;
  let staked = 0;
  let returned = 0;
  let net = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let streak = 0;
  let curWin = 0;
  let curLose = 0;
  let longestWin = 0;
  let longestLose = 0;

  const tableAgg = new Map<TableId, { rounds: number; net: number; wins: number }>();
  const sideAgg = new Map<SideBetId, { wagers: number; hits: number; staked: number; net: number }>();

  for (const r of settled) {
    if (roundIsWin(r)) wins++;
    else if (roundIsLoss(r)) losses++;
    else pushes++;

    if (r.hands.some((h) => h.outcome === "blackjack")) blackjacks++;
    staked += r.reserved;
    returned += r.returned;
    net += r.net;
    largestWin = Math.max(largestWin, r.net);
    largestLoss = Math.min(largestLoss, r.net);

    if (roundIsWin(r)) {
      curWin++;
      curLose = 0;
      longestWin = Math.max(longestWin, curWin);
      streak = curWin;
    } else if (roundIsLoss(r)) {
      curLose++;
      curWin = 0;
      longestLose = Math.max(longestLose, curLose);
      streak = -curLose;
    }

    const t = tableAgg.get(r.tableId) ?? { rounds: 0, net: 0, wins: 0 };
    t.rounds++;
    t.net += r.net;
    if (roundIsWin(r)) t.wins++;
    tableAgg.set(r.tableId, t);

    for (const sb of r.sideBets) {
      if (sb.stake <= 0) continue;
      const agg = sideAgg.get(sb.id) ?? { wagers: 0, hits: 0, staked: 0, net: 0 };
      agg.wagers++;
      agg.staked += sb.stake;
      agg.net += sb.net;
      if (sb.payout > 0) agg.hits++;
      sideAgg.set(sb.id, agg);
    }
  }

  const averageBet = rounds > 0 ? Math.round((staked / rounds) * 100) / 100 : 0;

  return {
    rounds,
    wins,
    losses,
    pushes,
    blackjacks,
    winRate: rounds > 0 ? Math.round((wins / rounds) * 10000) / 100 : 0,
    blackjackRate: rounds > 0 ? Math.round((blackjacks / rounds) * 10000) / 100 : 0,
    averageBet,
    largestWin,
    largestLoss,
    longestWinStreak: longestWin,
    longestLossStreak: longestLose,
    currentStreak: streak,
    sessionNet: Math.round(net * 100) / 100,
    grossStaked: Math.round(staked * 100) / 100,
    grossReturned: Math.round(returned * 100) / 100,
    byTable: [...tableAgg.entries()].map(([tableId, v]) => ({
      tableId,
      name: TABLE_MAP[tableId]?.name ?? tableId,
      rounds: v.rounds,
      net: Math.round(v.net * 100) / 100,
      winRate: v.rounds > 0 ? Math.round((v.wins / v.rounds) * 10000) / 100 : 0,
    })),
    sideBets: [...sideAgg.entries()].map(([id, v]) => ({
      id,
      name: SIDE_BET_LABEL_AR[id],
      wagers: v.wagers,
      hits: v.hits,
      staked: Math.round(v.staked * 100) / 100,
      net: Math.round(v.net * 100) / 100,
    })),
  };
}

/** The outcome a player most identifies with for a round (first hand). */
export function primaryOutcome(outcomes: readonly (HandOutcome | null)[]): HandOutcome | null {
  return outcomes.find((o) => o !== null) ?? null;
}

export function outcomeTone(outcome: HandOutcome | null): "good" | "bad" | "neutral" {
  if (!outcome) return "neutral";
  if (winOutcomes.includes(outcome)) return "good";
  if (loseOutcomes.includes(outcome)) return "bad";
  return "neutral";
}

export const OUTCOME_LABEL_AR: Record<HandOutcome, string> = {
  blackjack: "بلاك جاك!",
  win: "فوز",
  lose: "خسارة",
  push: "تعادل",
  surrender: "استسلام",
  bust: "انفجار اليد",
  dealer_bust: "الموزّع انفجر",
};
