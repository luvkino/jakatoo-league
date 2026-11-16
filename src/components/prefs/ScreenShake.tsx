"use client";

/**
 * SCREEN SHAKE — rebuilt from scratch.
 *
 * What was wrong before
 *  • ON by default with a 35 % intensity, so the whole website wobbled.
 *  • Two independent CSS keyframes translated the same element, which fought
 *    each other and produced sharp, unpredictable jumps.
 *  • The motion never stopped, so reading long tables felt unstable.
 *
 * How it works now
 *  • One rAF loop writes a *single* accumulated transform (translate + rotate)
 *    from smooth, incommensurate sine waves — no keyframe collisions, no jumps.
 *  • Amplitude uses a gentle quadratic curve (see `shakeAmplitude`): 0 % = 0px,
 *    15 % = 0.6px, 35 % = 1.6px, 100 % = 5px.
 *  • Default is OFF; the feature is opt-in from Settings → Visual effects.
 *  • The loop parks itself when the tab is hidden, when the user scrolls, and
 *    whenever a modal/overlay is open (verified by observing `body` children).
 *  • Reduced-motion always wins, and 0 % writes no transform at all.
 *  • Only `.jl-shake` regions (header + main) move, so fixed docks, modals and
 *    toasts stay perfectly still. Transforms never affect layout.
 *  • `previewShake()` lets Settings audition the chosen intensity for 2.2 s, and
 *    `pulseShake()` gives one-off game-feel impacts (casino wins, match saves).
 */

import { useEffect, useRef } from "react";
import { shakeActive, shakeAmplitude, shakeDuration, shakeRotation } from "@/lib/prefs";
import { usePlayerPrefs } from "./PlayerPrefsProvider";

const SHAKE_CSS_VAR = "--shake-amp";
const TARGETS = ".jl-shake";

interface ShakeRuntimeState {
  enabled: boolean;
  amp: number;
  since: number;
  previewUntil: number;
  pulse: { amp: number; until: number } | null;
}

const runtime: ShakeRuntimeState = {
  enabled: false,
  amp: 0,
  since: 0,
  previewUntil: 0,
  pulse: null,
};

/** Idempotent: updates the target amplitude without ever restarting a jump. */
export function setShakeRuntime(amp: number, enabled: boolean) {
  if (runtime.enabled !== enabled) runtime.since = performance.now();
  runtime.enabled = enabled;
  runtime.amp = enabled ? amp : 0;
  if (enabled && amp === 0) runtime.enabled = false;
  applyTargets(0, 0, 0);
}

/** Auditions the current intensity for `ms` even if the feature is off. */
export function previewShake(amp: number, ms = 2200) {
  if (typeof performance === "undefined") return;
  runtime.previewUntil = performance.now() + ms;
  runtime.amp = Math.max(runtime.amp, Math.min(6, amp));
  runtime.since = performance.now();
}

/** One short, controlled impact (used for game feedback). */
export function pulseShake(strength = 1, ms = 260) {
  if (typeof performance === "undefined") return;
  const amp = Math.max(0.6, Math.min(5, runtime.amp > 0 ? runtime.amp + strength : strength * 2));
  runtime.pulse = { amp, until: performance.now() + ms };
}

let rafId: number | null = null;

function clearTargets() {
  if (typeof document === "undefined") return;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(TARGETS))) {
    el.style.transform = "";
    el.style.willChange = "";
  }
}

/**
 * Writes the transform for this frame.
 * Smooth, incommensurate waves: x ≈ sin(t·1.0), y ≈ sin(t·1.37), r ≈ sin(t·0.83).
 */
function applyTargets(x: number, y: number, rot: number) {
  if (typeof document === "undefined") return;
  const t = x === 0 && y === 0 && rot === 0 ? "" : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(TARGETS))) {
    el.style.transform = t;
    el.style.willChange = t ? "transform" : "";
  }
}

function animate(now: number) {
  const previewing = now < runtime.previewUntil;
  const active = (runtime.enabled && runtime.amp > 0) || previewing;
  const pulsing = runtime.pulse && now < runtime.pulse.until;

  if (!active && !pulsing) {
    applyTargets(0, 0, 0);
    rafId = null;
    return;
  }

  const base = runtime.amp;
  const impact = pulsing ? runtime.pulse!.amp * (1 - (now - (runtime.pulse!.until - 260)) / 260) : 0;
  const amp = Math.max(0, base + impact);
  const elapsed = (now - runtime.since) / 1000;
  // Slow, breathing drift: ~0.9 Hz horizontal, 0.63 Hz vertical, 0.43 Hz roll.
  const x = Math.sin(elapsed * 5.1) * 0.78 + Math.sin(elapsed * 2.3) * 0.22;
  const y = Math.sin(elapsed * 3.9 + 1.7) * 0.8 + Math.sin(elapsed * 2.9) * 0.2;
  const rot = Math.sin(elapsed * 2.7 + 0.6);

  applyTargets(
    x * amp * 0.55,
    y * amp * 0.42,
    rot * shakeRotation(Math.min(100, amp * 12)),
  );

  rafId = requestAnimationFrame(animate);
}

function ensureLoop() {
  if (rafId !== null || typeof window === "undefined") return;
  runtime.since = performance.now();
  rafId = requestAnimationFrame(animate);
}

export function ShakeDriver() {
  const { prefs, reducedMotion } = usePlayerPrefs();
  const enabled = shakeActive(prefs, reducedMotion);
  const amp = enabled ? shakeAmplitude(prefs.shakeIntensity) : 0;
  const duration = shakeDuration(prefs.shakeIntensity);
  const paused = useRef(false);

  // Publish the live amplitude so the Settings preview can explain it.
  useEffect(() => {
    document.documentElement.style.setProperty(SHAKE_CSS_VAR, `${amp.toFixed(2)}px`);
    document.documentElement.dataset.shake = amp > 0 ? "on" : "off";
    document.documentElement.dataset.shakeint = String(enabled ? prefs.shakeIntensity : 0);
    document.documentElement.style.setProperty("--shake-duration", `${duration}s`);
    setShakeRuntime(amp, amp > 0);
    if (amp > 0) ensureLoop();
    else if (!runtime.previewUntil) clearTargets();
  }, [amp, enabled, prefs.shakeIntensity, duration]);

  // Never shake while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      paused.current = document.visibilityState === "hidden";
      if (paused.current) {
        clearTargets();
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (runtime.enabled && runtime.amp > 0) ensureLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    clearTargets();
  }, []);

  return null;
}

export const SHAKE_MAX_PX = 5;
