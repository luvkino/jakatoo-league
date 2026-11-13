// Hydration-safe, subscription-based reduced-motion preference hook.
// Uses useSyncExternalStore (server snapshot = false) so it never causes
// hydration mismatches and never triggers the set-state-in-effect pattern.

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function snapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    snapshot,
    () => false,
  );
}
