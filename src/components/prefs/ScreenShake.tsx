"use client";

/**
 * Continuous arcade screen shake.
 *
 * Implementation notes (performance + safety):
 *  • The motion itself is pure CSS (`transform` keyframes on `.shake-target`
 *    regions: header, page content, mobile dock) so it runs on the compositor
 *    with **zero JavaScript per frame** — smooth on mobile, no layout work.
 *  • Transforms never affect layout: nothing shifts, and clicking, typing,
 *    scrolling, forms and menus keep working normally.
 *  • Overlays, modals and dialogs are intentionally NOT shake targets, so they
 *    stay perfectly still and never interfere with the content.
 *  • The amplitude lives in `--shake-amp` on <html>; changing the intensity
 *    re-uses the same running animation (no jump), and 0% / OFF / reduced
 *    motion stops it completely.
 *  • Max displacement ≈6.5px at 100%, ≈1.6px at 25%, ≈3.2px at 50%.
 */

import { useEffect } from "react";
import { shakeActive, shakeAmplitude } from "@/lib/prefs";
import { usePlayerPrefs } from "./PlayerPrefsProvider";

export function ShakeDriver() {
  const { prefs, reducedMotion } = usePlayerPrefs();
  const enabled = shakeActive(prefs, reducedMotion);
  const amp = enabled ? shakeAmplitude(prefs.shakeIntensity) : 0;

  // Live amplitude in px, used by the CSS keyframes below.
  useEffect(() => {
    document.documentElement.style.setProperty("--shake-amp", `${amp.toFixed(2)}px`);
  }, [amp]);

  useEffect(() => {
    // Only toggle the CSS switch: enabling/disabling must never restart (and
    // therefore visibly jump) an already-running animation.
    document.documentElement.dataset.shake = amp > 0 ? "on" : "off";
  }, [amp]);

  return null;
}

export const SHAKE_MAX_PX = 6.5;
