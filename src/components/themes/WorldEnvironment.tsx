"use client";

/**
 * WORLD ENVIRONMENT — the living, full-page pixel-art backdrop.
 *
 * One fixed, non-interactive layer renders *behind* the real site content
 * (z-index below the shell, `pointer-events: none`, `aria-hidden`). The scene
 * art itself lives in `./worldScenes` so the Settings preview can reuse the
 * exact same environment. Particle animations are pure CSS (transform/opacity)
 * and are disabled by the master toggle, the intensity setting and the OS
 * reduced-motion preference.
 */

import { memo, useMemo } from "react";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";
import { SCENES } from "./worldScenes";
import { DEFAULT_PREFS } from "@/lib/prefs";

export const WorldEnvironment = memo(function WorldEnvironment() {
  const { prefs, reducedMotion } = usePlayerPrefs();
  const theme = prefs?.theme ?? DEFAULT_PREFS.theme;
  const intensity = prefs?.bgIntensity ?? DEFAULT_PREFS.bgIntensity;
  const animationsOn = prefs?.bgAnimations ?? DEFAULT_PREFS.bgAnimations;
  const Scene = useMemo(() => SCENES[theme] ?? SCENES.classic, [theme]);
  const animOn = animationsOn && intensity > 0 && !reducedMotion;

  return (
    <div
      className="wenv-root"
      aria-hidden
      data-world-scene={theme}
      data-bg={animOn ? "on" : "off"}
      data-bg-level={intensity}
    >
      <div className="wenv-palette" data-palette={theme} />
      <Scene />
      <div className="wenv-grain" />
    </div>
  );
});
