/**
 * ORIGINAL 8-BIT SOUNDTRACKS — one arrangement per world theme.
 *
 * Every track here is an ORIGINAL composition written for JACKAROO LEAGUE.
 * Nothing is transcribed, sampled or reproduced from any existing game or
 * film soundtrack; the goal is only to capture each atmosphere (neon city,
 * underwater adventure, 80s arcade hall, cheerful platformer, Miami sunset,
 * mysterious casino, desert lab) with layered pulse/square waves, a bass
 * channel, arpeggios and synthesised percussion.
 *
 * Melody strings use the 16-step notation from `./notation`.
 */

import type { WorldTheme } from "@/lib/worldThemes";

export type Wave = "square" | "pulse25" | "pulse12" | "triangle" | "sawtooth" | "sine";

export interface TrackDef {
  bpm: number;
  /** Bars in the loop (every array below has this many entries). */
  bars: number;
  /** 0 = straight, 0.5 = full triplet swing on off-beat 8ths. */
  swing?: number;
  lead: { wave: Wave; gain: number; bars: string[] };
  /** Counter-melody / pad, played one octave down by default. */
  harmony?: { wave: Wave; gain: number; octaveShift?: number; bars: string[] };
  chords: string[];
  bass: {
    wave: Wave;
    gain: number;
    /** 16-step rhythm; `x` plays the chord root, `5` the fifth, `8` the octave. */
    pattern: string;
    octave: number;
  };
  arp?: { wave: Wave; gain: number; rate: number; octave: number; mode: "up" | "down" | "updown" };
  drums: { kick: string; snare: string; hat: string; hatGain?: number; snareGain?: number };
}

export const TRACKS: Record<WorldTheme, TrackDef> = {
  /* ------------------------------------------------------------- CLASSIC */
  classic: {
    bpm: 96,
    bars: 8,
    lead: {
      wave: "pulse25",
      gain: 0.16,
      bars: [
        "A4:2 . . E5:2 . D5:1 C5:1 . B4:2 . .",
        "C5:2 . . G4:2 . A4:1 B4:1 . C5:3 .",
        "F4:2 . . C5:2 . B4:1 A4:1 . G4:2 . .",
        "G4:2 . . D5:2 . B4:1 G4:1 . E4:2 . .",
        "A4:1 C5:1 E5:1 A5:2 . G5:1 E5:1 . D5:1 C5:1 B4:2 .",
        "C5:1 E5:1 G5:1 C6:2 . B5:1 G5:1 . E5:1 D5:1 C5:2 .",
        "F4:1 A4:1 C5:1 F5:2 . E5:1 C5:1 . A4:1 G4:1 F4:2 .",
        "E4:1 G4:1 B4:1 E5:3 . . D5:1 C5:1 B4:2 . .",
      ],
    },
    harmony: {
      wave: "triangle",
      gain: 0.09,
      octaveShift: -12,
      bars: [
        "A3:6 . . E4:6 . . .",
        "C4:6 . . G3:6 . . .",
        "F3:6 . . C4:6 . . .",
        "G3:6 . . D4:6 . . .",
        "A3:6 . . E4:6 . . .",
        "C4:6 . . G3:6 . . .",
        "F3:6 . . A3:6 . . .",
        "E3:6 . . B3:6 . . .",
      ],
    },
    chords: ["Am", "C", "F", "G", "Am", "C", "F", "Em"],
    bass: { wave: "triangle", gain: 0.2, pattern: "x...x...x...x...", octave: 2 },
    arp: { wave: "pulse12", gain: 0.045, rate: 4, octave: 4, mode: "updown" },
    drums: {
      kick: "x.......x.......",
      snare: "....x.......x...",
      hat: "..x...x...x...x.",
      hatGain: 0.05,
    },
  },

  /* ----------------------------------------------------------- CYBERPUNK */
  cyberpunk: {
    bpm: 118,
    bars: 8,
    lead: {
      wave: "sawtooth",
      gain: 0.075,
      bars: [
        "D5:1 A4:1 D5:1 F5:1 . E5:2 . D5:1 . C5:1 D5:2 . .",
        "Bb4:1 F4:1 Bb4:1 D5:1 . C5:2 . Bb4:1 . A4:1 Bb4:2 . .",
        "G4:1 D4:1 G4:1 Bb4:1 . A4:2 . G4:1 . F4:1 G4:2 . .",
        "A4:1 E4:1 A4:1 C5:2 . B4:1 A4:1 . G4:1 A4:2 . . .",
        "D5:1 F5:1 A5:1 D6:1 . C6:2 . A5:1 . F5:1 A5:2 . .",
        "Bb5:1 A5:1 F5:1 D5:1 . F5:2 . E5:1 . D5:1 F5:2 . .",
        "C5:1 F5:1 A5:1 C6:2 . Bb5:1 A5:1 . G5:1 F5:2 . .",
        "E5:1 G#5:1 B5:1 E6:2 . D6:1 B5:1 . G#5:1 A5:4 .",
      ],
    },
    harmony: {
      wave: "pulse25",
      gain: 0.05,
      bars: [
        "D4:2 . F4:2 . A3:2 . F4:2 .",
        "Bb3:2 . D4:2 . F4:2 . D4:2 .",
        "G3:2 . Bb3:2 . D4:2 . Bb3:2 .",
        "A3:2 . C4:2 . E4:2 . C4:2 .",
        "D4:2 . A4:2 . F4:2 . A4:2 .",
        "Bb3:2 . F4:2 . D4:2 . F4:2 .",
        "C4:2 . G4:2 . E4:2 . G4:2 .",
        "E4:2 . B4:2 . G#4:2 . B4:2 .",
      ],
    },
    chords: ["Dm", "Bb", "Gm", "A7", "Dm", "Bb", "F", "A7"],
    bass: { wave: "sawtooth", gain: 0.16, pattern: "x.x.x.x.x.x.x.x.", octave: 1 },
    arp: { wave: "pulse12", gain: 0.04, rate: 2, octave: 5, mode: "up" },
    drums: {
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "..x...x...x...x.",
      hatGain: 0.045,
      snareGain: 0.12,
    },
  },

  /* --------------------------------------------------------------- OCEAN */
  ocean: {
    bpm: 92,
    bars: 8,
    lead: {
      wave: "triangle",
      gain: 0.17,
      bars: [
        "F4:2 . A4:1 C5:1 . C5:2 . D5:1 C5:1 . A4:4",
        "G4:2 . C5:2 . E5:2 . D5:1 C5:1 . G4:4",
        "A4:2 . D5:2 . F5:2 . E5:1 D5:1 . A4:4",
        "Bb4:2 . D5:2 . F5:3 . E5:1 . D5:4",
        "C5:1 F5:1 A5:2 . G5:1 F5:1 . E5:1 . D5:2 . .",
        "E5:1 G5:1 C6:2 . B5:1 G5:1 . E5:1 . D5:2 . .",
        "F5:1 A5:1 D6:2 . C6:1 A5:1 . F5:1 . E5:2 . .",
        "D5:1 F5:1 Bb5:2 . A5:1 F5:1 . D5:2 . . . .",
      ],
    },
    harmony: {
      wave: "pulse25",
      gain: 0.06,
      bars: [
        "A4:4 . C5:4 . E4:4 . .",
        "C5:4 . E5:4 . G4:4 . .",
        "D5:4 . F5:4 . A4:4 . .",
        "F5:4 . A5:4 . D4:4 . .",
        "A5:4 . G5:4 . C5:4 . .",
        "G5:4 . E5:4 . C5:4 . .",
        "A5:4 . F5:4 . D5:4 . .",
        "F5:4 . D5:4 . Bb4:4 . .",
      ],
    },
    chords: ["Fmaj7", "C", "Dm7", "Bb", "Fmaj7", "C", "Dm7", "Bb"],
    bass: { wave: "triangle", gain: 0.19, pattern: "x.....x.......x.", octave: 1 },
    arp: { wave: "pulse12", gain: 0.035, rate: 3, octave: 4, mode: "updown" },
    drums: {
      kick: "x.......x.......",
      snare: "........x.......",
      hat: "..x.....x...x...",
      hatGain: 0.03,
      snareGain: 0.06,
    },
  },

  /* -------------------------------------------------------------- ARCADE */
  arcade: {
    bpm: 140,
    bars: 8,
    lead: {
      wave: "pulse12",
      gain: 0.15,
      bars: [
        "A4:1 A4:1 . E5:1 A4:1 . A4:1 A4:1 . C5:1 A4:1 . A4:1 . G4:1 .",
        "F4:1 F4:1 . C5:1 F4:1 . F4:1 F4:1 . A4:1 F4:1 . F4:1 . E4:1 .",
        "G4:1 G4:1 . D5:1 G4:1 . G4:1 G4:1 . B4:1 G4:1 . G4:1 . F4:1 .",
        "E4:1 E4:1 . B4:1 E4:1 . E4:1 G4:1 B4:1 E5:2 . D5:1 B4:1 . .",
        "A5:1 . A5:1 . E5:1 . C5:1 . A4:1 . C5:1 . E5:1 . A5:1 .",
        "F5:1 . F5:1 . C5:1 . A4:1 . F4:1 . A4:1 . C5:1 . F5:1 .",
        "G5:1 . G5:1 . D5:1 . B4:1 . G4:1 . B4:1 . D5:1 . G5:1 .",
        "E5:1 D5:1 C5:1 B4:1 A4:2 . G#4:1 B4:1 E5:2 . . . . .",
      ],
    },
    harmony: {
      wave: "pulse25",
      gain: 0.055,
      bars: [
        "A4:1 . . E4:1 . . A4:1 . . E4:1 . . A4:1 . .",
        "F4:1 . . C4:1 . . F4:1 . . C4:1 . . F4:1 . .",
        "G4:1 . . D4:1 . . G4:1 . . D4:1 . . G4:1 . .",
        "E4:1 . . B3:1 . . E4:1 . . B3:1 . . E4:1 . .",
        "A4:1 . . E4:1 . . A4:1 . . E4:1 . . A4:1 . .",
        "F4:1 . . C4:1 . . F4:1 . . C4:1 . . F4:1 . .",
        "G4:1 . . D4:1 . . G4:1 . . D4:1 . . G4:1 . .",
        "E4:1 . . B3:1 . . G#4:1 . . B4:1 . . E5:1 . .",
      ],
    },
    chords: ["Am", "F", "G", "Em", "Am", "F", "G", "E7"],
    bass: { wave: "square", gain: 0.13, pattern: "x.x.x.x.x.x.x.x.", octave: 1 },
    arp: { wave: "pulse25", gain: 0.032, rate: 2, octave: 5, mode: "up" },
    drums: {
      kick: "x..x..x.x..x..x.",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      hatGain: 0.04,
      snareGain: 0.12,
    },
  },

  /* ---------------------------------------------------- MUSHROOM KINGDOM */
  mushroom: {
    bpm: 132,
    bars: 8,
    swing: 0.18,
    lead: {
      wave: "pulse25",
      gain: 0.16,
      bars: [
        "G4:1 C5:1 E5:1 G5:2 . E5:1 G5:1 . A5:2 G5:1 E5:1 . .",
        "F5:1 D5:1 B4:1 D5:2 . F5:1 E5:1 . D5:2 B4:1 G4:1 . .",
        "E4:1 G4:1 C5:1 E5:2 . D5:1 C5:1 . B4:2 G4:1 A4:1 . .",
        "A4:1 C5:1 F5:1 A5:2 . G5:1 F5:1 . C5:2 A4:1 F4:1 . .",
        "C5:1 E5:1 G5:2 . E5:1 G5:1 . C6:2 . B5:1 G5:1 . .",
        "F5:1 A5:2 . G5:1 F5:1 . E5:1 D5:1 . E5:2 . C5:1 . .",
        "D5:1 F5:1 A5:2 . G5:1 F5:1 . D5:1 E5:1 . F5:2 . . .",
        "G4:1 B4:1 D5:1 G5:2 . F5:1 D5:1 . B4:1 C5:1 . . . .",
      ],
    },
    harmony: {
      wave: "triangle",
      gain: 0.07,
      bars: [
        "E4:3 . . C4:3 . . G3:3 . .",
        "B3:3 . . G3:3 . . D4:3 . .",
        "C4:3 . . G3:3 . . E4:3 . .",
        "F4:3 . . C4:3 . . A3:3 . .",
        "G4:3 . . E4:3 . . C5:3 . .",
        "A4:3 . . F4:3 . . C4:3 . .",
        "D4:3 . . A3:3 . . F4:3 . .",
        "G3:3 . . D4:3 . . B3:3 . .",
      ],
    },
    chords: ["C", "G", "Am", "F", "C", "F", "G", "C"],
    bass: {
      wave: "triangle",
      gain: 0.2,
      pattern: "x..x..x...x..x..",
      octave: 2,
    },
    arp: { wave: "pulse12", gain: 0.03, rate: 4, octave: 5, mode: "up" },
    drums: {
      kick: "x..x..x...x..x..",
      snare: "....x.......x...",
      hat: "..x...x...x...x.",
      hatGain: 0.04,
    },
  },

  /* ----------------------------------------------------------- VICE SUNSET */
  vice: {
    bpm: 104,
    bars: 8,
    lead: {
      wave: "sawtooth",
      gain: 0.07,
      bars: [
        "A4:4 . C5:2 . E5:4 . D5:2 .",
        "C5:3 . B4:1 . A4:4 . F4:4 .",
        "A4:2 . G4:2 . E4:4 . C4:4 .",
        "D4:4 . E4:2 . G4:4 . A4:2 .",
        "E5:3 . D5:1 . C5:4 . A4:4 .",
        "F5:3 . E5:1 . C5:4 . A4:4 .",
        "G5:3 . E5:1 . C5:4 . G4:4 .",
        "A4:4 . C5:2 . B4:2 . G#4:2 . E4:4 .",
      ],
    },
    harmony: {
      wave: "pulse25",
      gain: 0.055,
      bars: [
        "E4:2 . A4:2 . C5:2 . E5:2 .",
        "E4:2 . G4:2 . C5:2 . B4:2 .",
        "C4:2 . E4:2 . A4:2 . G4:2 .",
        "D4:2 . F#4:2 . A4:2 . C5:2 .",
        "C5:2 . E5:2 . A5:2 . E5:2 .",
        "A4:2 . C5:2 . F5:2 . C5:2 .",
        "E5:2 . G5:2 . C6:2 . G5:2 .",
        "B4:2 . E5:2 . G#5:2 . E5:2 .",
      ],
    },
    chords: ["Am", "F", "C", "Dm", "Am", "F", "C", "E7"],
    bass: { wave: "sawtooth", gain: 0.15, pattern: "x...x...x...x..5", octave: 1 },
    arp: { wave: "pulse12", gain: 0.038, rate: 2, octave: 4, mode: "updown" },
    drums: {
      kick: "x.....x.x.......",
      snare: "....x.......x...",
      hat: "..x.x.x...x.x.x.",
      hatGain: 0.045,
      snareGain: 0.13,
    },
  },

  /* ------------------------------------------------- BALATRO / LUCKY CASINO */
  balatro: {
    bpm: 100,
    bars: 8,
    swing: 0.62,
    lead: {
      wave: "pulse25",
      gain: 0.15,
      bars: [
        "D5:2 . F5:1 . A5:2 . G5:1 F5:1 . E5:2 . C5:1 .",
        "Bb4:2 . D5:1 . F5:2 . E5:1 D5:1 . C5:2 . . .",
        "E5:2 . G5:1 . C6:2 . Bb5:1 G5:1 . E5:2 . . .",
        "A4:1 C5:1 E5:1 A5:2 . G5:1 E5:1 . C#5:2 . . . .",
        "F5:2 . A5:1 . D6:3 . C6:1 A5:1 . F5:2 . D5:1 .",
        "G5:2 . Bb5:1 . D6:3 . C6:1 Bb5:1 . G5:2 . . .",
        "E5:1 G5:1 Bb5:1 D6:2 . C6:1 Bb5:1 . G5:2 . E5:2 . .",
        "A5:2 . G5:1 . E5:1 . C#5:1 A4:1 . E4:4 . . .",
      ],
    },
    harmony: {
      wave: "triangle",
      gain: 0.08,
      bars: [
        "A4:1 . C5:1 . E5:1 . A4:1 . F4:1 . A4:1 . D5:1 . F4:1 .",
        "D4:1 . F4:1 . Bb4:1 . D4:1 . E4:1 . G4:1 . Bb4:1 . E4:1 .",
        "C4:1 . E4:1 . G4:1 . C5:1 . Bb3:1 . D4:1 . G4:1 . Bb3:1 .",
        "A3:1 . C#4:1 . E4:1 . A4:1 . G3:1 . C4:1 . E4:1 . G4:1 .",
        "F4:1 . A4:1 . D5:1 . F4:1 . A4:1 . D5:1 . F5:1 . D5:1 .",
        "G4:1 . Bb4:1 . D5:1 . G4:1 . Bb4:1 . D5:1 . G5:1 . D5:1 .",
        "E4:1 . G4:1 . Bb4:1 . E4:1 . G4:1 . Bb4:1 . D5:1 . Bb4:1 .",
        "A4:1 . C#5:1 . E5:1 . A5:1 . C#5:1 . A4:1 . E4:1 . C#4:1 .",
      ],
    },
    chords: ["Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "A7"],
    bass: {
      wave: "triangle",
      gain: 0.22,
      pattern: "x.......x...5...",
      octave: 1,
    },
    arp: { wave: "pulse12", gain: 0.03, rate: 3, octave: 5, mode: "updown" },
    drums: {
      kick: "x.......x.x.....",
      snare: "....x..x....x..x",
      hat: "..x.x...x.x.x...",
      hatGain: 0.035,
      snareGain: 0.075,
    },
  },

  /* ---------------------------------------------------------- DESERT LAB */
  desert: {
    bpm: 88,
    bars: 8,
    lead: {
      wave: "pulse25",
      gain: 0.14,
      bars: [
        "E5:3 . . D5:1 . B4:3 . . . .",
        "C5:3 . . B4:1 . G4:4 . . . .",
        "A4:3 . . C5:1 . E5:4 . . . .",
        "B4:2 . D#5:2 . F#5:3 . E5:1 . B4:4",
        "E5:2 . F5:1 E5:1 . B4:2 . G4:1 A4:1 . B4:3 . .",
        "C5:2 . D5:1 C5:1 . G4:2 . E4:1 F4:1 . G4:3 . .",
        "A4:2 . B4:1 A4:1 . E4:2 . C4:1 D4:1 . E4:3 . .",
        "F#4:2 . G4:1 F#4:1 . D#4:2 . B3:2 . . . . .",
      ],
    },
    harmony: {
      wave: "triangle",
      gain: 0.09,
      bars: [
        "E4:6 . . B3:6 . . .",
        "C4:6 . . G3:6 . . .",
        "A3:6 . . E4:6 . . .",
        "B3:6 . . F#4:6 . . .",
        "E4:6 . . B3:6 . . .",
        "C4:6 . . G3:6 . . .",
        "A3:6 . . E4:6 . . .",
        "B3:6 . . D#4:6 . . .",
      ],
    },
    chords: ["Em", "Cmaj7", "Am", "B7", "Em", "Cmaj7", "Am", "B7"],
    bass: {
      wave: "triangle",
      gain: 0.21,
      pattern: "x.......x.....5.",
      octave: 1,
    },
    arp: { wave: "pulse12", gain: 0.028, rate: 4, octave: 4, mode: "down" },
    drums: {
      kick: "x.........x.....",
      snare: "........x.......",
      hat: "....x.......x...",
      hatGain: 0.028,
      snareGain: 0.085,
    },
  },
};

/** Total loop length in seconds — useful for previews and tests. */
export function trackDuration(theme: WorldTheme): number {
  const t = TRACKS[theme];
  return t.bars * 16 * (60 / t.bpm / 4);
}

export const TRACK_THEMES = Object.keys(TRACKS) as WorldTheme[];
