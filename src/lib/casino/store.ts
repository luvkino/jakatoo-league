/**
 * CASINO STORE — browser-local persistence for the standalone casino.
 *
 * Everything here is *virtual chips only* and completely separate from the
 * league: no points, no rankings, no player statistics are read or written.
 * The store is a tiny external store (same pattern as the rest of the app) so
 * SSR/hydration stays clean and every component re-renders consistently.
 */

import { normalizeRules, CLASSIC_RULES, TABLE_MAP, type TableRules, type TableId, normalizeTableId } from "./tables";
import type { CasinoRoundRecord } from "./stats";
import { EMPTY_LEDGER, type LedgerStats } from "./settlement";
import type { SideBetId } from "./sideBets";

export const CASINO_KEY = "jl_casino_v1";
export const STARTING_CHIPS = 2000;
export const PRACTICE_CHIPS = 5000;
export const HISTORY_LIMIT = 60;

export interface CasinoSettings {
  /** Sound effects for the casino (separate from the league SFX switch). */
  soundEnabled: boolean;
  /** Show the basic-strategy hint while playing. */
  showStrategyHint: boolean;
  /** Confirm before committing an all-in bet. */
  confirmAllIn: boolean;
}

export interface CasinoState {
  v: 1;
  chips: number;
  practiceChips: number;
  tableId: TableId;
  customRules: TableRules;
  lastBet: number;
  lastSideBets: { id: SideBetId; stake: number }[];
  history: CasinoRoundRecord[];
  ledger: LedgerStats;
  settings: CasinoSettings;
  practice: boolean;
  updatedAt: number;
}

export const DEFAULT_CASINO_SETTINGS: CasinoSettings = {
  soundEnabled: true,
  showStrategyHint: false,
  confirmAllIn: true,
};

export function defaultCasinoState(): CasinoState {
  return {
    v: 1,
    chips: STARTING_CHIPS,
    practiceChips: PRACTICE_CHIPS,
    tableId: "classic",
    customRules: { ...CLASSIC_RULES },
    lastBet: 0,
    lastSideBets: [],
    history: [],
    ledger: EMPTY_LEDGER,
    settings: { ...DEFAULT_CASINO_SETTINGS },
    practice: false,
    updatedAt: 0,
  };
}

const clampChips = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(50_000_000, Math.floor(n)));
};

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

/** Sanitises any stored/imported payload — never throws. */
export function normalizeCasinoState(raw: unknown): CasinoState {
  const base = defaultCasinoState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const history = Array.isArray(r.history)
    ? (r.history.filter((h) => h && typeof h === "object").slice(0, HISTORY_LIMIT) as CasinoRoundRecord[])
    : [];
  const ledgerRaw = (r.ledger ?? {}) as Partial<LedgerStats>;
  const ledger: LedgerStats = {
    rounds: clampChips(ledgerRaw.rounds, 0),
    wins: clampChips(ledgerRaw.wins, 0),
    losses: clampChips(ledgerRaw.losses, 0),
    pushes: clampChips(ledgerRaw.pushes, 0),
    blackjacks: clampChips(ledgerRaw.blackjacks, 0),
    surrenders: clampChips(ledgerRaw.surrenders, 0),
    grossPayout: Number.isFinite(ledgerRaw.grossPayout) ? Number(ledgerRaw.grossPayout) : 0,
    net: Number.isFinite(ledgerRaw.net) ? Number(ledgerRaw.net) : 0,
    applied: Array.isArray(ledgerRaw.applied) ? ledgerRaw.applied.filter((x) => typeof x === "string").slice(-200) : [],
  };
  const settingsRaw = (r.settings ?? {}) as Partial<CasinoSettings>;
  const lastSide = Array.isArray(r.lastSideBets)
    ? (r.lastSideBets.filter(
        (s): s is { id: SideBetId; stake: number } =>
          !!s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string",
      ) as { id: SideBetId; stake: number }[])
    : [];

  return {
    v: 1,
    chips: clampChips(r.chips, base.chips),
    practiceChips: clampChips(r.practiceChips, base.practiceChips),
    tableId: normalizeTableId(r.tableId),
    customRules: normalizeRules(r.customRules, CLASSIC_RULES),
    lastBet: clampChips(r.lastBet, 0),
    lastSideBets: lastSide.map((s) => ({ id: s.id, stake: clampChips(s.stake, 0) })),
    history,
    ledger,
    settings: {
      soundEnabled: bool(settingsRaw.soundEnabled, DEFAULT_CASINO_SETTINGS.soundEnabled),
      showStrategyHint: bool(settingsRaw.showStrategyHint, DEFAULT_CASINO_SETTINGS.showStrategyHint),
      confirmAllIn: bool(settingsRaw.confirmAllIn, DEFAULT_CASINO_SETTINGS.confirmAllIn),
    },
    practice: bool(r.practice, false),
    updatedAt: Number(r.updatedAt) || 0,
  };
}

/** The rules currently in force (custom table reads the player's own rules). */
/** Sound is a player preference now; the store mirrors it for the lobby UI. */
export function readCasinoSound(prefs: { casinoSfxEnabled: boolean; masterVolume: number }): boolean {
  return prefs.casinoSfxEnabled && prefs.masterVolume > 0;
}

export function rulesFor(state: CasinoState, tableId: TableId = state.tableId): TableRules {
  if (tableId === "custom") return normalizeRules(state.customRules, CLASSIC_RULES);
  return TABLE_MAP[tableId]?.rules ?? CLASSIC_RULES;
}

/* ------------------------------------------------------- external store */

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: CasinoState = defaultCasinoState();
let serverSnapshot: CasinoState = defaultCasinoState();

function emit() {
  for (const fn of Array.from(listeners)) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("jl:casino-changed"));
  }
}

export function readCasino(): CasinoState {
  if (typeof window === "undefined") return serverSnapshot;
  try {
    const raw = window.localStorage.getItem(CASINO_KEY);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = raw ? normalizeCasinoState(JSON.parse(raw)) : defaultCasinoState();
    return cached;
  } catch {
    return defaultCasinoState();
  }
}

export function writeCasino(next: CasinoState, broadcast = true) {
  if (typeof window === "undefined") {
    serverSnapshot = next;
    return;
  }
  cached = next;
  cachedRaw = JSON.stringify(next);
  try {
    window.localStorage.setItem(CASINO_KEY, cachedRaw);
  } catch {
    /* storage unavailable — keep the in-memory copy */
  }
  if (broadcast) emit();
}

export function patchCasino(patch: Partial<CasinoState>) {
  const next: CasinoState = { ...readCasino(), ...patch, updatedAt: Date.now() };
  writeCasino(next);
  return next;
}

export function subscribeCasino(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CASINO_KEY) {
      cachedRaw = null;
      cb();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export const getServerCasinoSnapshot = (): CasinoState => serverSnapshot;

/** Adds chips (used by the virtual top-up; never real money). */
export function topUpChips(amount = 1000): CasinoState {
  const cur = readCasino();
  return patchCasino({ chips: Math.max(0, cur.chips + Math.floor(amount)) });
}

export function resetPracticeChips(): CasinoState {
  return patchCasino({ practiceChips: PRACTICE_CHIPS });
}

/** Records a finished round: balance, history and ledger in one atomic write. */
export function commitRound(args: {
  balance: number;
  practice: boolean;
  record: CasinoRoundRecord;
  ledger: LedgerStats;
  lastBet: number;
  lastSideBets: { id: SideBetId; stake: number }[];
}): CasinoState {
  const cur = readCasino();
  const history = [args.record, ...cur.history].slice(0, HISTORY_LIMIT);
  return patchCasino({
    chips: args.practice ? cur.chips : Math.max(0, Math.floor(args.balance)),
    practiceChips: args.practice ? Math.max(0, Math.floor(args.balance)) : cur.practiceChips,
    history,
    ledger: args.ledger,
    lastBet: args.lastBet,
    lastSideBets: args.lastSideBets,
  });
}

/** Keeps the local casino copy in sync with the player preference. */
export function commitTable(tableId: TableId): CasinoState {
  const cur = readCasino();
  if (cur.tableId === tableId) return cur;
  return patchCasino({ tableId });
}

export function clearCasinoHistory(): CasinoState {
  return patchCasino({ history: [], ledger: EMPTY_LEDGER });
}
