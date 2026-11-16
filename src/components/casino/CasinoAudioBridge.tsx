"use client";

/**
 * CasinoAudioBridge — keeps the casino SFX synth in sync with the casino
 * settings and unlocks the audio context on the first real interaction.
 */

import { useEffect } from "react";
import { setCasinoSoundEnabled, unlockCasinoAudio } from "@/lib/casino/sound";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";

export function CasinoAudioBridge() {
  const { prefs } = usePlayerPrefs();
  // The casino respects its own switch *and* the league's master mute. Both
  // live in the player preferences, so they sync across pages and devices.
  const on = prefs.casinoSfxEnabled && prefs.masterVolume > 0;

  useEffect(() => {
    setCasinoSoundEnabled(on);
  }, [on]);

  useEffect(() => {
    const unlock = () => unlockCasinoAudio();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
