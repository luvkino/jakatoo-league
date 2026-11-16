"use client";

/**
 * AudioManager — single owner of background music + SFX levels.
 *
 *  • Music follows the selected world theme and loops with a look-ahead
 *    scheduler (see src/lib/audio/engine.ts), so client-side navigation never
 *    restarts it.
 *  • Playback only starts after a real user interaction (autoplay policy) and
 *    gracefully resumes on the first gesture if the browser blocked it.
 *  • Theme changes cross-fade; the previous loop is always stopped first.
 */

import { useEffect, useRef } from "react";
import {
  ensureMusic,
  isMusicPlaying,
  setMusicTheme,
  setMusicVolume,
  startMusic,
  stopMusic,
} from "@/lib/audio/engine";
import { audioLevels, isMuted } from "@/lib/prefs";
import { setSfxLevel } from "@/lib/sound";
import { setEggSfxLevel } from "@/components/easter/eggSfx";
import { setCasinoGlobalMuted } from "@/lib/casino/sound";
import { usePlayerPrefs } from "./PlayerPrefsProvider";

export function AudioManager() {
  const { prefs } = usePlayerPrefs();
  const unlockedRef = useRef(false);
  const themeRef = useRef(prefs.theme);
  const levels = audioLevels(prefs);
  // Central global mute: master volume 0 silences every bus at once.
  const muted = isMuted(prefs);
  const shouldPlay = !muted && prefs.musicEnabled && levels.music > 0;

  // Keep EVERY SFX bus in sync with the sliders + the single global mute
  // (league/general SFX, Easter-Egg SFX and Casino SFX all follow it).
  useEffect(() => {
    setSfxLevel(muted || !prefs.sfxEnabled ? 0 : levels.sfx);
    setEggSfxLevel(muted || !prefs.sfxEnabled ? 0 : levels.sfx);
    setCasinoGlobalMuted(muted);
  }, [muted, prefs.sfxEnabled, levels.sfx]);

  // Volume / enable switches, and theme changes (old loop always stops first).
  useEffect(() => {
    if (!shouldPlay) {
      stopMusic();
      return;
    }
    if (!unlockedRef.current) {
      // Nothing audible yet: just make sure the engine knows the world.
      ensureMusic(prefs.theme);
      return;
    }
    const themeChanged = themeRef.current !== prefs.theme;
    themeRef.current = prefs.theme;
    // Re-start when the world changed, or when music was stopped (e.g. the
    // user disabled/re-enabled it, or a preview ended): the same call always
    // stops the previous loop first, so tracks can never overlap.
    if (themeChanged || !isMusicPlaying()) {
      setMusicTheme(prefs.theme, levels.music, true);
    } else {
      setMusicVolume(levels.music);
    }
  }, [shouldPlay, levels.music, prefs.theme]);

  // First real gesture unlocks playback (never before).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = () => {
      unlockedRef.current = true;
      if (shouldPlay) startMusic(prefs.theme, levels.music);
    };
    const opts: AddEventListenerOptions = { once: false, passive: true };
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [shouldPlay, prefs.theme, levels.music]);

  // Pause while the tab is hidden; resume seamlessly when it returns.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (!unlockedRef.current) return;
      if (!shouldPlay) return;
      if (document.visibilityState === "hidden") stopMusic();
      else startMusic(prefs.theme, levels.music);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [shouldPlay, prefs.theme, levels.music]);

  return null;
}
