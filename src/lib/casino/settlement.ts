/**
 * CASINO — centralized settlement & bankroll ledger.
 *
 * This is the ONLY place that turns a finished round into a chip movement.
 * It exists because the previous implementation subtracted the stake and then
 * added a *profit* multiplier, which let a winning round reduce the balance.
 *
 * Rules encoded here (each one is unit tested):
 *  • The risk (main bets + doubles + splits + side bets + insurance) is taken
 *    once, when the cards are dealt (`reserved`).
 *  • A round credits `returned` = all gross payouts, where a payout always
 *    includes the stake back for wins/pushes.
 *  • Net = returned − reserved.
 *  • A round id is applied at most once (`ledger` guard) → duplicate payouts
 *    are impossible.
 *  • The balance is clamped at 0, so it can never become negative.
 */

import { sideBetsTotal, totalStakedHands, type GameState } from "./engine";

export interface RoundSettlement {
  roundId: string;
  /** Chips taken from the balance for the round. */
  reserved: number;
  /** Gross chips credited back. */
  returned: number;
  /** returned − reserved (may be negative). */
  net: number;
  /** Balance after the round. */
  balance: number;
  /** True when the round had already been settled before this call. */
  duplicate: boolean;
}

export interface LedgerStats {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  surrenders: number;
  /** Cumulative gross payout. */
  grossPayout: number;
  /** Cumulative net profit/loss. */
  net: number;
  /** Circular fingerprint list of applied round ids (bounded for storage). */
  applied: string[];
}

export const EMPTY_LEDGER: LedgerStats = {
  rounds: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  surrenders: 0,
  grossPayout: 0,
  net: 0,
  applied: [],
};

const LEDGER_MEMORY = 200;

export function isRoundApplied(ledger: LedgerStats, roundId: string): boolean {
  return ledger.applied.includes(roundId);
}

/**
 * Settles a finished round against a balance.
 * Pure: returns the new balance and the ledger bookkeeping; the caller stores
 * the result. Already-settled round ids are rejected (no double payout).
 */
export function settleRoundChips(
  round: GameState,
  balance: number,
  ledger: LedgerStats = EMPTY_LEDGER,
): { settlement: RoundSettlement; ledger: LedgerStats } {
  const startBalance = Math.max(0, Math.round(balance));
  const reserved = Math.round(round.reserved);
  const returned = Math.round(round.returned);

  if (isRoundApplied(ledger, round.roundId)) {
    return {
      settlement: {
        roundId: round.roundId,
        reserved: 0,
        returned: 0,
        net: 0,
        balance: startBalance,
        duplicate: true,
      },
      ledger,
    };
  }

  const nextBalance = Math.max(0, startBalance - reserved + returned);
  const net = returned - reserved;

  const outcomes = round.hands.map((h) => h.outcome);
  const won = outcomes.filter((o) => o === "win" || o === "blackjack" || o === "dealer_bust").length;
  const lost = outcomes.filter((o) => o === "lose" || o === "bust" || o === "surrender").length;
  const pushed = outcomes.filter((o) => o === "push").length;
  const blackjacks = outcomes.filter((o) => o === "blackjack").length;
  const surrenders = outcomes.filter((o) => o === "surrender").length;

  const applied = [...ledger.applied, round.roundId].slice(-LEDGER_MEMORY);

  return {
    settlement: {
      roundId: round.roundId,
      reserved,
      returned,
      net,
      balance: nextBalance,
      duplicate: false,
    },
    ledger: {
      rounds: ledger.rounds + 1,
      wins: ledger.wins + (won > lost ? 1 : 0),
      losses: ledger.losses + (lost > won ? 1 : 0),
      pushes: ledger.pushes + (pushed > 0 && won === 0 && lost === 0 ? 1 : 0),
      blackjacks: ledger.blackjacks + (blackjacks > 0 ? 1 : 0),
      surrenders: ledger.surrenders + (surrenders > 0 ? 1 : 0),
      grossPayout: Math.round((ledger.grossPayout + returned) * 100) / 100,
      net: Math.round((ledger.net + net) * 100) / 100,
      applied,
    },
  };
}

/**
 * Recomputes the round's chip totals from the hands and side bets.
 * Used by tests to assert the engine never invents chips.
 */
export function auditRound(round: GameState): {
  reserved: number;
  returned: number;
  expectedReserved: number;
  handsTotal: number;
  sideTotal: number;
  insurance: number;
  ok: boolean;
} {
  const handsTotal = totalStakedHands(round);
  const sideTotal = sideBetsTotal(round);
  const insurance = round.insurance.stake;
  const expectedReserved = handsTotal + sideTotal + insurance;
  return {
    reserved: round.reserved,
    returned: round.returned,
    expectedReserved,
    handsTotal,
    sideTotal,
    insurance,
    ok: Math.abs(expectedReserved - round.reserved) < 0.01,
  };
}

/** Clamps a proposed bet into [0, balance] without ever going negative. */
export function clampBet(value: number, balance: number, max = Number.POSITIVE_INFINITY): number {
  const v = Math.floor(Number.isFinite(value) ? value : 0);
  return Math.max(0, Math.min(v, Math.max(0, Math.floor(balance)), Math.floor(max)));
}

export const CHIP_DENOMINATIONS = [1, 5, 25, 100, 500, 1000] as const;

export interface ChipStack {
  denom: number;
  count: number;
}

/** Breaks a bet into visual chip stacks (largest denomination first). */
export function chipsFor(amount: number): ChipStack[] {
  let left = Math.max(0, Math.floor(amount));
  const out: ChipStack[] = [];
  for (const denom of [...CHIP_DENOMINATIONS].reverse()) {
    const count = Math.floor(left / denom);
    if (count > 0) {
      out.push({ denom, count });
      left -= denom * count;
    }
  }
  return out;
}

export const CHIP_COLORS: Record<number, { base: string; edge: string; text: string }> = {
  1: { base: "#e7e5e4", edge: "#a8a29e", text: "#1f2937" },
  5: { base: "#ef4444", edge: "#991b1b", text: "#fff7ed" },
  25: { base: "#22c55e", edge: "#15803d", text: "#f0fdf4" },
  100: { base: "#1e293b", edge: "#0f172a", text: "#f8fafc" },
  500: { base: "#a855f7", edge: "#6b21a8", text: "#faf5ff" },
  1000: { base: "#f59e0b", edge: "#b45309", text: "#451a03" },
};
