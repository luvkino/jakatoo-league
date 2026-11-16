"use client";

/**
 * CONTRAST DRIVER — applies the WCAG-guaranteed colour tokens from
 * `src/lib/contrast.ts` to the document root.
 *
 * The CSS palettes in `globals.css` / `themes.css` remain the no-JS fallback,
 * but this driver is the authoritative source at runtime: for the active
 * theme (or multiverse world) × accent it writes `--fg`, `--muted`,
 * `--accent-fg` and `--accent-text` (and the rest) as inline custom properties,
 * guaranteeing a ≥ 4.5:1 minimum for every text/background combination. The
 * automated test `tests/contrast.test.mts` asserts the same resolver.
 */

import { useEffect, useMemo } from "react";
import { useAppearance } from "@/components/Settings";
import { usePlayerPrefs } from "./PlayerPrefsProvider";
import { resolveTokens, type ResolvedTokens } from "@/lib/contrast";

function applyTokens(t: ResolvedTokens) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  const set = (name: string, value: string) => el.style.setProperty(name, value);
  set("--bg", t.bg);
  set("--card", t.card);
  set("--card2", t.card2);
  set("--fg", t.fg);
  set("--muted", t.muted);
  set("--line", t.line);
  set("--good", t.good);
  set("--bad", t.bad);
  set("--accent", t.accent);
  set("--accent-fg", t.accentFg);
  set("--accent-fg-strong", t.accentFgStrong);
  set("--accent-text", t.accentText);
}

export function ContrastDriver() {
  const { a } = useAppearance();
  const { prefs } = usePlayerPrefs();

  const tokens = useMemo<ResolvedTokens>(() => {
    const world = prefs.theme;
    // A multiverse world overrides the base theme palette; otherwise use the
    // base theme. The accent "theme" on a world resolves to that world's
    // signature accent (matching the CSS `[data-world][data-accent="theme"]`).
    const key = world && world !== "classic" ? world : a.theme;
    return resolveTokens(key as Parameters<typeof resolveTokens>[0], a.accent);
  }, [prefs.theme, a.theme, a.accent]);

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  return null;
}
