// ============================================================================
// EASTER EGG DISCOVERY STORE — 100% browser-local (localStorage).
// No discovery data, chips, or achievements ever leave the browser.
// Mirrors the useSyncExternalStore pattern used by Settings.tsx so React 19
// SSR/hydration stays clean (server snapshot = empty defaults).
// ============================================================================

import { useSyncExternalStore } from "react";
import { HUNTER_REQUIRED, type EggAchId, type EggId } from "./eggData";
import { newBlackjackStats, type BlackjackStats } from "./blackjackEngine";

export interface EggFindings {
  /** eggId -> ISO date string of discovery */
  eggs: Readonly<Record<string, string>>;
  /** achievementId -> ISO date string of unlock */
  achievements: Readonly<Record<string, string>>;
}

export const EMPTY_FINDINGS: EggFindings = { eggs: {}, achievements: {} };

const FINDINGS_KEY = "jl_egg_findings";
const PET_KEY = "jl_egg_pet";
const BJ_KEY = "jl_egg_blackjack";
const META_KEY = "jl_egg_meta";

const listeners = new Set<() => void>();
function emit() {
  for (const cb of listeners) cb();
}
export function subscribeEggStore(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FINDINGS_KEY || e.key === PET_KEY || e.key === BJ_KEY || e.key === META_KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode…) — silently degrade */
  }
  emit();
}

// ---- findings (discoveries + secret achievements) --------------------------

let findingsCacheRaw: string | null = null;
let findingsCacheVal: EggFindings = EMPTY_FINDINGS;

export function readFindings(): EggFindings {
  if (typeof window === "undefined") return EMPTY_FINDINGS;  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    if (raw === findingsCacheRaw) return findingsCacheVal;
    findingsCacheRaw = raw;
    if (!raw) {
      findingsCacheVal = EMPTY_FINDINGS;
    } else {
      const parsed = JSON.parse(raw) as Partial<EggFindings>;
      findingsCacheVal = {
        eggs: parsed.eggs ?? {},
        achievements: parsed.achievements ?? {},
      };
    }
    return findingsCacheVal;
  } catch {
    return EMPTY_FINDINGS;
  }
}

function writeFindings(next: EggFindings) {
  findingsCacheRaw = JSON.stringify(next);
  findingsCacheVal = next;
  writeJson(FINDINGS_KEY, next);
}

export function useEggFindings(): EggFindings {
  return useSyncExternalStore(subscribeEggStore, readFindings, () => EMPTY_FINDINGS);
}

/** Returns true when this is a brand-new discovery. */
export function discoverEgg(id: EggId): boolean {
  const cur = readFindings();
  if (cur.eggs[id]) return false;
  writeFindings({ ...cur, eggs: { ...cur.eggs, [id]: new Date().toISOString() } });
  checkSecretHunter();
  return true;
}

/** Returns true when this is a brand-new unlock. */
export function unlockEggAchievement(id: EggAchId): boolean {
  const cur = readFindings();
  if (cur.achievements[id]) return false;
  writeFindings({ ...cur, achievements: { ...cur.achievements, [id]: new Date().toISOString() } });
  return true;
}

function checkSecretHunter() {
  const cur = readFindings();
  if (cur.achievements.secret_hunter) return;
  const all = HUNTER_REQUIRED.every((id) => cur.eggs[id]);
  if (all) {
    writeFindings({
      ...cur,
      achievements: { ...cur.achievements, secret_hunter: new Date().toISOString() },
    });
  }
}

// ---- hidden pet ---------------------------------------------------------------

export function readPetHidden(): boolean {
  const v = readJson<{ hidden?: boolean }>(PET_KEY, { hidden: true });
  return v.hidden !== false; // default: hidden until the code is used
}
export function writePetHidden(hidden: boolean) {
  writeJson(PET_KEY, { hidden });
}
export function useEggPetHidden(): boolean {
  return useSyncExternalStore(
    subscribeEggStore,
    () => readPetHidden(),
    () => true,
  );
}

// ---- blackjack virtual chips --------------------------------------------------

export function readBlackjackStats(): BlackjackStats {
  return readJson<BlackjackStats>(BJ_KEY, newBlackjackStats());
}
export function writeBlackjackStats(stats: BlackjackStats) {
  writeJson(BJ_KEY, stats);
}

// ---- misc meta (1% rare-event gating) -----------------------------------------

export interface EggMeta {
  onePercentLastAt: string | null;
}
export function readEggMeta(): EggMeta {
  return readJson<EggMeta>(META_KEY, { onePercentLastAt: null });
}
export function writeEggMeta(meta: EggMeta) {
  writeJson(META_KEY, meta);
}
