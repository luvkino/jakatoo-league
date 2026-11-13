"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface Appearance {
  theme: "dark" | "light" | "amoled" | "midnight";
  accent: "gold" | "emerald" | "sky" | "rose" | "violet" | "orange";
  density: "comfortable" | "compact";
  leaderboard: "table" | "cards";
  radius: "rounded" | "sharp";
  anim: boolean;
  dashboard: "tabs" | "stacked";
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  accent: "gold",
  density: "comfortable",
  leaderboard: "table",
  radius: "rounded",
  anim: true,
  dashboard: "tabs",
};

const KEY = "jl_appearance";

function apply(a: Appearance) {
  const el = document.documentElement;
  el.dataset.theme = a.theme;
  el.dataset.accent = a.accent;
  el.dataset.density = a.density;
  el.dataset.radius = a.radius;
  el.dataset.anim = a.anim ? "on" : "off";
}

const Ctx = createContext<{ a: Appearance; set: (p: Partial<Appearance>) => void; reset: () => void }>({
  a: DEFAULT_APPEARANCE,
  set: () => {},
  reset: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [a, setA] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const merged = { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) } as Appearance;
        setA(merged);
        apply(merged);
      }
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  const set = useCallback((p: Partial<Appearance>) => {
    setA((prev) => {
      const next = { ...prev, ...p };
      apply(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);
  const reset = useCallback(() => set(DEFAULT_APPEARANCE), [set]);

  return <Ctx.Provider value={{ a, set, reset }}>{children}</Ctx.Provider>;
}

export const useAppearance = () => useContext(Ctx);

// Applied before first paint to avoid a theme flash.
export const THEME_BOOT_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem("${KEY}")||"{}");var e=document.documentElement;e.dataset.theme=a.theme||"dark";e.dataset.accent=a.accent||"gold";e.dataset.density=a.density||"comfortable";e.dataset.radius=a.radius||"rounded";e.dataset.anim=a.anim===false?"off":"on";}catch(x){}})();`;
