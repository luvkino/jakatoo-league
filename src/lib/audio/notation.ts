/**
 * Tiny music notation helpers (pure — unit tested).
 *
 * Melody phrases are authored as compact step strings:
 *   "D5:1 F5:1 A5:1 D6:1 A5:1 F5:1 D5:4"   (16 sixteenth-steps per bar)
 *   "." = one step of rest, "-" = one step of hold (extends the last note).
 */

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** "C#5" → 73 (MIDI). Returns null for unparsable tokens. */
export function noteToMidi(note: string): number | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(note.trim());
  if (!m) return null;
  const pc = PITCH_CLASS[`${m[1].toUpperCase()}${m[2]}`];
  if (pc === undefined) return null;
  const octave = Number(m[3]);
  return (octave + 1) * 12 + pc;
}

export interface ParsedNote {
  step: number;
  midi: number;
  len: number;
}

/** Parses one bar (16 steps). Malformed tokens are skipped, never thrown. */
export function parseBar(bar: string, stepsPerBar = 16): ParsedNote[] {
  const out: ParsedNote[] = [];
  let pos = 0;
  const tokens = bar.trim().split(/\s+/).filter(Boolean);
  for (const raw of tokens) {
    if (pos >= stepsPerBar) break;
    if (raw === "." || raw === "r") {
      pos += 1;
      continue;
    }
    if (raw === "-") {
      const last = out[out.length - 1];
      if (last) last.len += 1;
      pos += 1;
      continue;
    }
    const [notePart, lenPart] = raw.split(":");
    const midi = noteToMidi(notePart);
    const len = lenPart ? Math.max(1, Math.min(stepsPerBar, parseInt(lenPart, 10) || 1)) : 1;
    if (midi === null) {
      pos += 1;
      continue;
    }
    const capped = Math.min(len, stepsPerBar - pos);
    out.push({ step: pos, midi, len: capped });
    pos += capped;
  }
  return out;
}

export function parsePhrase(bars: string[], stepsPerBar = 16): ParsedNote[] {
  return bars.flatMap((bar, i) =>
    parseBar(bar, stepsPerBar).map((n) => ({ ...n, step: n.step + i * stepsPerBar })),
  );
}

const QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
  m9: [0, 3, 7, 10, 14],
};

/** "Am7" → absolute MIDI pitch classes (root in octave 4 by default). */
export function chordTones(symbol: string, rootOctave = 4): number[] {
  const m = /^([A-Ga-g][#b]?)([^/]*)/.exec(symbol.trim());
  if (!m) return [60, 64, 67];
  const rootMidi = noteToMidi(`${m[1]}${rootOctave}`);
  const base = rootMidi ?? 60;
  const quality = QUALITIES[m[2]] ?? QUALITIES[""];
  return quality.map((interval) => base + interval);
}

/** Step duration in seconds for a 16th-note grid at a given tempo. */
export function stepSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

/** "x...x...x...x..." → list of step indices (16 steps per bar). */
export function parseDrumPattern(pattern: string): number[] {
  const clean = pattern.replace(/\s+/g, "");
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) if (clean[i] === "x" || clean[i] === "X") out.push(i);
  return out;
}
