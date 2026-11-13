"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type AnimIntensity = "off" | "low" | "normal" | "extreme";

export interface Appearance {
  theme: "dark" | "light" | "amoled" | "midnight";
  accent: "gold" | "emerald" | "sky" | "rose" | "violet" | "orange";
  density: "comfortable" | "compact";
  leaderboard: "table" | "cards";
  radius: "rounded" | "sharp";
  anim: boolean;
  dashboard: "tabs" | "stacked";
  // New Chaos Mode, Trash Talk, Sound, and Animation Intensity controls
  chaosMode: boolean;
  trashTalk: boolean;
  sound: boolean;
  animIntensity: AnimIntensity;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  accent: "gold",
  density: "comfortable",
  leaderboard: "table",
  radius: "sharp",
  anim: true,
  dashboard: "tabs",
  chaosMode: false,
  trashTalk: true,
  sound: false,
  animIntensity: "normal",
};

const KEY = "jl_appearance";

function normalize(raw: Partial<Appearance>): Appearance {
  const merged = { ...DEFAULT_APPEARANCE, ...raw };
  // Keep legacy `anim` boolean and `animIntensity` consistent
  if (raw.anim === false && raw.animIntensity === undefined) {
    merged.animIntensity = "off";
  }
  if (raw.animIntensity !== undefined) {
    merged.anim = raw.animIntensity !== "off";
  } else {
    merged.animIntensity = merged.anim ? merged.animIntensity : "off";
  }
  return merged;
}

function apply(a: Appearance) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const effectiveIntensity = reduced && a.animIntensity !== "off" ? "low" : a.animIntensity;
  el.dataset.theme = a.theme;
  el.dataset.accent = a.accent;
  el.dataset.density = a.density;
  el.dataset.radius = a.radius;
  el.dataset.anim = a.anim && effectiveIntensity !== "off" ? "on" : "off";
  el.dataset.chaos = a.chaosMode ? "on" : "off";
  el.dataset.intensity = effectiveIntensity;
}

// External store for localStorage appearance so React 19 SSR/hydration stays clean
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedVal: Appearance = DEFAULT_APPEARANCE;

function readStore(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedVal;
    cachedRaw = raw;
    cachedVal = raw ? normalize(JSON.parse(raw) as Partial<Appearance>) : DEFAULT_APPEARANCE;
    return cachedVal;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  for (const fn of listeners) fn();
}

const Ctx = createContext<{ a: Appearance; set: (p: Partial<Appearance>) => void; reset: () => void }>({
  a: DEFAULT_APPEARANCE,
  set: () => {},
  reset: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const a = useSyncExternalStore(subscribe, readStore, () => DEFAULT_APPEARANCE);

  useEffect(() => {
    apply(a);
  }, [a]);

  const set = useCallback((p: Partial<Appearance>) => {
    const cur = readStore();
    const next = normalize({ ...cur, ...p });
    if (p.anim !== undefined && p.animIntensity === undefined) {
      next.animIntensity = p.anim ? (cur.animIntensity === "off" ? "normal" : cur.animIntensity) : "off";
      next.anim = p.anim;
    }
    if (p.animIntensity !== undefined) {
      next.anim = p.animIntensity !== "off";
    }
    const serialized = JSON.stringify(next);
    cachedRaw = serialized;
    cachedVal = next;
    apply(next);
    try {
      localStorage.setItem(KEY, serialized);
    } catch {
      /* storage unavailable */
    }
    emit();
  }, []);

  const reset = useCallback(() => {
    const serialized = JSON.stringify(DEFAULT_APPEARANCE);
    cachedRaw = serialized;
    cachedVal = DEFAULT_APPEARANCE;
    apply(DEFAULT_APPEARANCE);
    try {
      localStorage.setItem(KEY, serialized);
    } catch {
      /* storage unavailable */
    }
    emit();
  }, []);

  const value = useMemo(() => ({ a, set, reset }), [a, set, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAppearance = () => useContext(Ctx);

// Applied before first paint to avoid a theme flash.
export const THEME_BOOT_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem("${KEY}")||"{}");var e=document.documentElement;var rm=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;var inten=a.animIntensity||(a.anim===false?"off":"normal");if(rm&&inten!=="off")inten="low";e.dataset.theme=a.theme||"dark";e.dataset.accent=a.accent||"gold";e.dataset.density=a.density||"comfortable";e.dataset.radius=a.radius||"sharp";e.dataset.anim=(a.anim===false||inten==="off")?"off":"on";e.dataset.chaos=a.chaosMode?"on":"off";e.dataset.intensity=inten;}catch(x){}})();`;
