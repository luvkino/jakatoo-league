"use client";

/**
 * PlayerPrefsProvider — the single source of truth for the new preferences.
 *
 *  • The browser is the immediate store (instant switching, works offline and
 *    before the user picks a profile), mirroring the existing `Appearance`
 *    store pattern so hydration stays clean.
 *  • When the user selects their league profile, preferences are also pushed to
 *    the database (`/api/prefs`), so any device shows the same theme, avatar,
 *    volumes, shake intensity and match-animation setting after login.
 *  • Nothing here ever mutates league data.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_PREFS,
  normalizePrefs,
  bgActive,
  shakeActive,
  shakeAmplitude,
  toServerPrefs,
  audioLevels,
  type PlayerPrefs,
} from "@/lib/prefs";
import { randomAvatar, type AvatarConfig } from "@/lib/avatar";
import { useReducedMotion } from "@/components/easter/useReducedMotion";

const KEY = "jl_prefs_v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedVal: PlayerPrefs = DEFAULT_PREFS;
let serverSnapshotCache: PlayerPrefs | null = null;

function readStore(): PlayerPrefs {
  if (typeof window === "undefined") {
    if (!serverSnapshotCache) serverSnapshotCache = { ...DEFAULT_PREFS, avatar: { ...DEFAULT_PREFS.avatar } };
    return serverSnapshotCache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedVal;
    cachedRaw = raw;
    cachedVal = raw ? normalizePrefs(JSON.parse(raw)) : { ...DEFAULT_PREFS, avatar: { ...DEFAULT_PREFS.avatar } };
    return cachedVal;
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeStore(next: PlayerPrefs, broadcast = true) {
  cachedVal = next;
  cachedRaw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, cachedRaw);
  } catch {
    /* storage unavailable */
  }
  if (broadcast) for (const fn of listeners) fn();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cachedRaw = null; // force re-read on next snapshot
      cb();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

interface Ctx {
  prefs: PlayerPrefs;
  set: (patch: Partial<PlayerPrefs>) => void;
  /** Local-only update (no server write) — used after an explicit API save. */
  setLocal: (patch: Partial<PlayerPrefs>) => void;
  reset: () => void;
  /** Recomputes everything for the selected league profile. */
  selectProfile: (playerId: string | null) => Promise<void>;
  saving: boolean;
  syncError: string | null;
  reducedMotion: boolean;
  /** Saved avatar for a player id, or null when they use the default art. */
  avatarFor: (playerId: string) => AvatarConfig | null;
}

const PrefsCtx = createContext<Ctx>({
  prefs: DEFAULT_PREFS,
  set: () => {},
  setLocal: () => {},
  reset: () => {},
  selectProfile: async () => {},
  saving: false,
  syncError: null,
  reducedMotion: false,
  avatarFor: () => null,
});

/** Applied before first paint so the world theme never flashes the wrong palette. */
export const PREFS_BOOT_SCRIPT = `(function(){try{
var p=JSON.parse(localStorage.getItem("${KEY}")||"{}");
var e=document.documentElement;
var theme=p.theme||"classic";
e.dataset.world=theme;
var si=(typeof p.shakeIntensity==="number"?p.shakeIntensity:15);
var on=p.shakeEnabled===true && si>0;
var t=Math.max(0,Math.min(100,si))/100;
var amp=on? (5*Math.pow(t,1.15)) : 0;
e.dataset.shake=amp>0? "on":"off";
e.dataset.shakeint=String(on?Math.round(si):0);
e.style.setProperty("--shake-amp", amp.toFixed(2)+"px");
var bg=(p.bgAnimations!==false);
var lvl=(typeof p.bgIntensity==="number"?p.bgIntensity:2);
e.dataset.bg=(bg && lvl>0)?"on":"off";
e.dataset.bgLevel=String(lvl);
}catch(x){}})();`;

export function PlayerPrefsProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, readStore, () => serverSnapshotCache ?? DEFAULT_PREFS);
  const reducedMotion = useReducedMotion();
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [avatarMap, setAvatarMap] = useState<Record<string, AvatarConfig>>({});

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Immediate DB write for the given snapshot. */
  const flushPersist = useCallback(async (next: PlayerPrefs) => {
    if (!next.profilePlayerId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${next.profilePlayerId}/prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toServerPrefs(next), avatar: next.avatar }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        setSyncError(json?.message ?? "تعذر حفظ الإعدادات على الخادم. تم حفظها على هذا الجهاز.");
      } else {
        setSyncError(null);
      }
    } catch {
      setSyncError("تعذر الاتصال بالخادم. تم حفظ الإعدادات على هذا الجهاز.");
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Debounced write-behind: dragging a volume slider fires many local updates
   * but only the final value is sent to the database.
   */
  const persist = useCallback(
    (next: PlayerPrefs) => {
      if (!next.profilePlayerId) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => void flushPersist(next), 550);
    },
    [flushPersist],
  );

  // Make sure a pending save still lands if the tab is closed/reloaded.
  useEffect(() => {
    const flushNow = () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
        void flushPersist(readStore());
      }
    };
    window.addEventListener("pagehide", flushNow);
    return () => window.removeEventListener("pagehide", flushNow);
  }, [flushPersist]);

  const set = useCallback(
    (patch: Partial<PlayerPrefs>) => {
      const next = normalizePrefs({ ...readStore(), ...patch });
      writeStore(next);
      // Theme, audio, shake, animations and avatar all persist per player.
      void persist(next);
    },
    [persist],
  );

  const setLocal = useCallback((patch: Partial<PlayerPrefs>) => {
    writeStore(normalizePrefs({ ...readStore(), ...patch }));
  }, []);

  const reset = useCallback(() => {
    const current = readStore();
    const next: PlayerPrefs = {
      ...DEFAULT_PREFS,
      avatar: { ...DEFAULT_PREFS.avatar },
      profilePlayerId: current.profilePlayerId,
    };
    writeStore(next);
    void persist(next);
  }, [persist]);

  const selectProfile = useCallback(
    async (playerId: string | null) => {
      setSyncError(null);
      const current = readStore();
      if (!playerId) {
        writeStore({ ...current, profilePlayerId: null });
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/players/${playerId}/prefs`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; prefs?: unknown; avatar?: unknown; message?: string }
          | null;
        if (res.ok && json?.ok) {
          const merged = normalizePrefs({
            ...current,
            ...(json.prefs as object),
            avatar: json.avatar ?? current.avatar,
            profilePlayerId: playerId,
          });
          writeStore(merged);
          setSyncError(null);
        } else {
          // DB unavailable: keep working locally, tell the user honestly.
          writeStore({ ...current, profilePlayerId: playerId });
          setSyncError(json?.message ?? "تعذر تحميل إعدادات اللاعب من الخادم حالياً.");
        }
      } catch {
        writeStore({ ...current, profilePlayerId: playerId });
        setSyncError("تعذر الاتصال بالخادم. تُحفظ الإعدادات على هذا الجهاز فقط.");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  // On first load, re-sync the selected profile from the database so another
  // device reflects the saved theme, audio, shake and animation settings.
  const bootSynced = useRef(false);
  useEffect(() => {
    if (bootSynced.current) return;
    bootSynced.current = true;
    const current = readStore();
    if (!current.profilePlayerId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/players/${current.profilePlayerId}/prefs`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; prefs?: unknown; avatar?: unknown }
          | null;
        if (!alive || !res.ok || !json?.ok) return;
        const next = normalizePrefs({
          ...current,
          ...(json.prefs as object),
          avatar: json.avatar ?? current.avatar,
          profilePlayerId: current.profilePlayerId,
        });
        writeStore(next);
      } catch {
        /* stay on the local snapshot */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Theme, shake and background animation state are applied to <html> so every
  // page and overlay follows the same world.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.world = prefs.theme;
    const on = shakeActive(prefs, reducedMotion);
    el.dataset.shake = on ? "on" : "off";
    el.dataset.shakeint = String(on ? prefs.shakeIntensity : 0);
    el.style.setProperty("--shake-amp", `${on ? shakeAmplitude(prefs.shakeIntensity) : 0}px`);
    const bg = bgActive(prefs, reducedMotion);
    el.dataset.bg = bg ? "on" : "off";
    el.dataset.bgLevel = String(prefs.bgIntensity);
    // Smooth cross-fade between worlds, then remove the marker.
    el.classList.add("world-fading");
    const t = window.setTimeout(() => el.classList.remove("world-fading"), 560);
    return () => window.clearTimeout(t);
  }, [prefs, reducedMotion]);

  // Everyone's saved avatars (single lightweight request, refreshed after saves).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/avatars", { credentials: "same-origin", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; avatars?: Record<string, AvatarConfig> }
          | null;
        if (alive && res.ok && json?.ok && json.avatars) setAvatarMap(json.avatars);
      } catch {
        /* keep defaults */
      }
    };
    void load();
    const onChanged = () => void load();
    window.addEventListener("jl:prefs-changed", onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      alive = false;
      window.removeEventListener("jl:prefs-changed", onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, []);

  const avatarFor = useCallback(
    (playerId: string): AvatarConfig | null => avatarMap[playerId] ?? null,
    [avatarMap],
  );

  const value = useMemo(
    () => ({ prefs, set, setLocal, reset, selectProfile, saving, syncError, reducedMotion, avatarFor }),
    [prefs, set, setLocal, reset, selectProfile, saving, syncError, reducedMotion, avatarFor],
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePlayerPrefs() {
  return useContext(PrefsCtx);
}

/** Convenience: a fresh random avatar seed (uses crypto when available). */
export function newAvatarSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  }
  return Math.floor(Math.random() * 4294967296);
}

export { randomAvatar };
export const PREFS_STORAGE_KEY = KEY;
