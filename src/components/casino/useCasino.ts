"use client";

/**
 * useCasino — binds the pure rules engine to the browser-local chip store.
 *
 * Responsibilities kept intentionally thin:
 *  • owns the live `GameState` for the current round,
 *  • routes every action through `reducer` (illegal moves surface as toasts),
 *  • settles a finished round exactly once through `settleRoundChips`,
 *  • plays the casino SFX for each step.
 *
 * All money math lives in `src/lib/casino/settlement.ts`; this hook never
 * computes a payout itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createState,
  legalMoves as computeLegalMoves,
  reducer,
  type Action,
  type GameState,
  type BetInput,
} from "@/lib/casino/engine";
import { rulesFor, readCasino, subscribeCasino, commitRound, commitTable, type CasinoState } from "@/lib/casino/store";
import { settleRoundChips, isRoundApplied, EMPTY_LEDGER } from "@/lib/casino/settlement";
import type { CasinoRoundRecord } from "@/lib/casino/stats";
import { primaryOutcome } from "@/lib/casino/stats";
import { handValue } from "@/lib/casino/cards";
import { playCasinoSfx } from "@/lib/casino/sound";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";

export function useCasinoStore(): CasinoState {
  const [state, setState] = useState<CasinoState>(() => readCasino());
  useEffect(() => {
    const sync = () => setState(readCasino());
    sync();
    return subscribeCasino(sync);
  }, []);
  return state;
}

export interface CasinoApi {
  game: GameState;
  store: CasinoState;
  balance: number;
  rules: ReturnType<typeof rulesFor>;
  moves: ReturnType<typeof computeLegalMoves>;
  message: string | null;
  lastSettlement: { net: number; returned: number; reserved: number } | null;
  deal: (bet: BetInput) => void;
  act: (action: Exclude<Action, { type: "deal" } | { type: "next" }>) => void;
  nextRound: () => void;
  resetShoe: () => void;
  /** Reveals the dealer's hole card and settles (no-op outside the dealer phase). */
  revealDealer: () => void;
}

export function useCasino(): CasinoApi {
  const store = useCasinoStore();
  const { prefs, set: setPrefs } = usePlayerPrefs();

  // The selected table is a *player preference* (saved with the profile), so it
  // follows the player across pages/devices; the local casino store mirrors it.
  const tableId = prefs.casinoTable;
  useEffect(() => {
    if (store.tableId === tableId) return;
    commitTable(tableId);
  }, [tableId, store.tableId]);

  const storeWithTable = useMemo(() => ({ ...store, tableId }), [store, tableId]);
  const rules = useMemo(() => rulesFor(storeWithTable), [storeWithTable]);
  void setPrefs;
  const balance = store.practice ? store.practiceChips : store.chips;

  const [game, setGame] = useState<GameState>(() => createState(rules));
  const [message, setMessage] = useState<string | null>(null);
  const [lastSettlement, setLastSettlement] = useState<CasinoApi["lastSettlement"]>(null);
  const settledRef = useRef<string | null>(null);

  // A table change (or a custom-rules edit) starts a fresh shoe of the right size.
  const tableKey = `${tableId}:${rules.decks}`;
  const tableKeyRef = useRef(tableKey);
  useEffect(() => {
    if (tableKeyRef.current === tableKey) return;
    tableKeyRef.current = tableKey;
    setGame(createState(rules));
    setMessage(null);
    settledRef.current = null;
    setLastSettlement(null);
  }, [tableKey, rules]);

  /** Commits the round to the store exactly once. */
  const settle = useCallback(
    (finished: GameState) => {
      if (finished.phase !== "settled") return;
      if (settledRef.current === finished.roundId) return;
      settledRef.current = finished.roundId;
      if (isRoundApplied(store.ledger, finished.roundId)) return;

      const { settlement, ledger } = settleRoundChips(finished, balance, store.ledger);
      if (settlement.duplicate) return;

      const record: CasinoRoundRecord = {
        id: finished.roundId,
        at: Date.now(),
        tableId,
        practice: store.practice,
        reserved: settlement.reserved,
        returned: settlement.returned,
        net: settlement.net,
        balance: settlement.balance,
        hands: finished.hands.map((h) => ({
          outcome: h.outcome,
          stake: h.stake + h.doubledStake,
          net: h.net,
          cards: h.cards.map((c) => `${c.r}${c.s}`).join(" "),
          total: handValue(h.cards).total,
          dealerCards: finished.dealer.map((c) => `${c.r}${c.s}`).join(" "),
          dealerTotal: handValue(finished.dealer).total,
        })),
        sideBets: finished.sideBetResults,
        insurance: {
          stake: finished.insurance.stake,
          result: finished.insurance.result,
          payout: finished.insurance.payout,
        },
        primaryOutcome: primaryOutcome(finished.hands.map((h) => h.outcome)),
      };

      commitRound({
        balance: settlement.balance,
        practice: store.practice,
        record,
        ledger: ledger ?? EMPTY_LEDGER,
        lastBet: finished.hands[0]?.stake ?? 0,
        lastSideBets: finished.sideBets,
      });
      setLastSettlement({ net: settlement.net, returned: settlement.returned, reserved: settlement.reserved });
    },
    [balance, store.ledger, store.practice, tableId],
  );

  /** Applies an engine action and settles the round when it finishes. */
  const apply = useCallback(
    (action: Action) => {
      try {
        setGame((prev) => {
          const next = reducer(prev, action, balance);
          if (next.phase === "settled") settle(next);
          return next;
        });
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "تعذر تنفيذ هذه الحركة.");
        playCasinoSfx("button");
      }
    },
    [balance, settle],
  );

  const deal = useCallback(
    (bet: BetInput) => {
      setMessage(null);
      setLastSettlement(null);
      settledRef.current = null;
      playCasinoSfx("bet");
      let dealt: GameState | null = null;
      try {
        setGame((prev) => {
          const base = prev.phase === "betting" ? prev : createState(rules, undefined);
          const next = reducer(base, { type: "deal", bet, balance });
          dealt = next;
          if (next.phase === "settled") settle(next);
          return next;
        });
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "تعذر توزيع الأوراق.");
      }
      if (dealt) playCasinoSfx("cardDeal");
    },
    [balance, rules, settle],
  );

  const act = useCallback(
    (action: Exclude<Action, { type: "deal" } | { type: "next" }>) => {
      setMessage(null);
      if (action.type === "hit" || action.type === "split") playCasinoSfx("cardDeal");
      if (action.type === "double" || action.type === "insurance") playCasinoSfx("chipPlace");
      if (action.type === "surrender") playCasinoSfx("cardFlip");
      apply(action);
    },
    [apply],
  );

  const revealDealer = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== "dealer") return prev;
      const next = reducer(prev, { type: "reveal" }, balance);
      if (next.phase === "settled") settle(next);
      return next;
    });
  }, [balance, settle]);

  const nextRound = useCallback(() => {
    setMessage(null);
    setLastSettlement(null);
    settledRef.current = null;
    setGame((prev) => createState(rules));
    playCasinoSfx("shuffle");
  }, [rules]);

  const resetShoe = useCallback(() => {
    setGame((prev) => ({ ...createState(rules), phase: "betting" }));
    playCasinoSfx("shuffle");
  }, [rules]);

  const moves = useMemo(() => computeLegalMoves(game, balance), [game, balance]);

  return {
    game,
    store: storeWithTable,
    balance,
    rules,
    moves,
    message,
    lastSettlement,
    deal,
    act,
    nextRound,
    resetShoe,
    revealDealer,
  };
}
