/**
 * 8-BIT MUSIC ENGINE — a tiny, dependency-free chiptune sequencer on top of the
 * Web Audio API.
 *
 * Design notes
 *  - Nothing is downloaded: every oscillator/percussion hit is synthesised
 *    locally, so the soundtrack adds zero media files and zero requests.
 *  - ONE AudioContext for the whole session, kept on `globalThis` outside
 *    React's tree. Because the provider never unmounts during client-side
 *    navigation, the loop keeps running seamlessly between pages.
 *  - Playback only starts from `startMusic()` (always called after a real user
 *    gesture) so browser autoplay policies are respected.
 *  - `setMusicTheme()` fades the old loop out, resets the sequencer and starts
 *    the new one a moment later, so two tracks can never overlap.
 */

import { chordTones, parseDrumPattern, parsePhrase, stepSeconds } from "./notation";
import { TRACKS, type TrackDef, type Wave } from "./tracks";
import type { WorldTheme } from "@/lib/worldThemes";

const LOOKAHEAD_MS = 45;
const SCHEDULE_AHEAD_S = 0.35;
const MUSIC_GAIN = 0.34; // background music always sits below the SFX

interface LiveMusic {
  ctx: AudioContext;
  out: GainNode;
  theme: WorldTheme;
  playing: boolean;
  timer: ReturnType<typeof setInterval> | null;
  nextStepTime: number;
  step: number;
  stepDur: number;
  totalSteps: number;
  cache: Map<string, { lead: ReturnType<typeof parsePhrase>; harmony: ReturnType<typeof parsePhrase> | null }>;
}

const globalStore = globalThis as typeof globalThis & { __jlMusic?: LiveMusic | null };

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    return new AC();
  } catch {
    return null;
  }
}

function ensureEngine(theme: WorldTheme): LiveMusic | null {
  const existing = globalStore.__jlMusic;
  if (existing) return existing;
  const ctx = createContext();
  if (!ctx) return null;
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.connect(ctx.destination);
  const def = TRACKS[theme] ?? TRACKS.classic;
  const m: LiveMusic = {
    ctx,
    out,
    theme,
    playing: false,
    timer: null,
    nextStepTime: ctx.currentTime + 0.2,
    step: 0,
    stepDur: stepSeconds(def.bpm),
    totalSteps: def.bars * 16,
    cache: new Map(),
  };
  globalStore.__jlMusic = m;
  return m;
}

/* ------------------------------------------------------------- synthesisers */

/**
 * Classic chiptune duty cycles. "pulse25" and "pulse12" are genuine pulse
 * waves (25% / 12.5% duty) built from harmonic coefficients — much cleaner and
 * less harsh than a plain 50% square wave, and instantly recognisable as an
 * 8-bit lead. Generated once per context and cached.
 */
const waveCache = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();

function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let perCtx = waveCache.get(ctx);
  if (!perCtx) {
    perCtx = new Map();
    waveCache.set(ctx, perCtx);
  }
  const cached = perCtx.get(duty);
  if (cached) return cached;
  const harmonics = 48;
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    // Fourier series of a duty-cycle pulse train
    real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perCtx.set(duty, wave);
  return wave;
}

function voice(m: LiveMusic, when: number, midi: number, dur: number, wave: Wave, gain: number) {
  const { ctx } = m;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  if (wave === "pulse25") osc.setPeriodicWave(pulseWave(ctx, 0.25));
  else if (wave === "pulse12") osc.setPeriodicWave(pulseWave(ctx, 0.125));
  else osc.type = wave as OscillatorType;
  osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), when);

  const peak = Math.max(0.0002, gain * (wave === "sawtooth" ? 0.72 : 1));
  const end = when + Math.max(0.05, dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + 0.009);
  g.gain.setValueAtTime(peak, Math.max(when + 0.01, end - 0.025));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(g);
  if (wave === "pulse12") {
    // thin "silver" chiptune colour without harsh low end
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;
    g.connect(hp);
    hp.connect(m.out);
  } else if (wave === "sawtooth") {
    // gentle lowpass keeps synth leads warm instead of piercing
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, when);
    lp.Q.value = 0.6;
    g.connect(lp);
    lp.connect(m.out);
  } else {
    g.connect(m.out);
  }
  osc.start(when);
  osc.stop(end + 0.02);
}

function kick(m: LiveMusic, when: number, gain = 0.42) {
  const { ctx } = m;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(148, when);
  osc.frequency.exponentialRampToValueAtTime(44, when + 0.11);
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  osc.connect(g);
  g.connect(m.out);
  osc.start(when);
  osc.stop(when + 0.18);
}

function noise(m: LiveMusic, when: number, dur: number, gain: number, highpass: number) {
  const { ctx } = m;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(m.out);
  src.start(when);
}

/* -------------------------------------------------------------- sequencer */

function scheduleStep(m: LiveMusic, def: TrackDef, step: number, when: number) {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const stepDur = m.stepDur;
  const swing = def.swing && step % 4 === 2 ? def.swing * stepDur * 0.5 : 0;
  const at = when + swing;

  const key = m.theme;
  let phrase = m.cache.get(key);
  if (!phrase) {
    phrase = {
      lead: parsePhrase(def.lead.bars),
      harmony: def.harmony ? parsePhrase(def.harmony.bars) : null,
    };
    m.cache.set(key, phrase);
  }

  for (const n of phrase.lead) {
    if (n.step === step) voice(m, at, n.midi, n.len * stepDur * 0.94, def.lead.wave, def.lead.gain);
  }
  if (phrase.harmony && def.harmony) {
    const shift = def.harmony.octaveShift ?? 0;
    for (const n of phrase.harmony) {
      if (n.step === step) {
        voice(m, at, n.midi + shift, n.len * stepDur * 0.9, def.harmony.wave, def.harmony.gain);
      }
    }
  }

  const chord = def.chords[bar % def.chords.length] ?? "Am";
  const tones = chordTones(chord, 3);

  const token = def.bass.pattern.padEnd(16, ".")[inBar];
  if (token === "x" || token === "5" || token === "8") {
    const root = tones[0] + (def.bass.octave - 3) * 12;
    const midi = token === "5" ? root + 7 : token === "8" ? root + 12 : root;
    voice(m, when, midi, stepDur * 1.85, def.bass.wave, def.bass.gain);
  }

  if (def.arp && step % def.arp.rate === 0) {
    const arpTones = chordTones(chord, def.arp.octave);
    const list = def.arp.mode === "down" ? [...arpTones].reverse() : arpTones;
    const cycle = def.arp.mode === "updown" ? list.length * 2 - 2 : list.length;
    const raw = (step / def.arp.rate) % cycle;
    const idx = Math.floor(def.arp.mode === "updown" && raw >= list.length ? cycle - raw : raw);
    const midi = list[Math.max(0, Math.min(list.length - 1, idx))];
    if (midi !== undefined) voice(m, when, midi, stepDur * 0.85, def.arp.wave, def.arp.gain);
  }

  if (parseDrumPattern(def.drums.kick).includes(inBar)) kick(m, when);
  if (parseDrumPattern(def.drums.snare).includes(inBar)) {
    noise(m, when, 0.12, def.drums.snareGain ?? 0.1, 1400);
  }
  if (parseDrumPattern(def.drums.hat).includes(inBar)) {
    noise(m, when, 0.045, def.drums.hatGain ?? 0.04, 6200);
  }
}

function tick(m: LiveMusic) {
  if (!m.playing) return;
  const def = TRACKS[m.theme] ?? TRACKS.classic;
  const now = m.ctx.currentTime;
  // If the tab was throttled we simply resume from "now" instead of bursting.
  if (m.nextStepTime < now - 0.5) m.nextStepTime = now + 0.05;
  while (m.nextStepTime < now + SCHEDULE_AHEAD_S) {
    scheduleStep(m, def, m.step, m.nextStepTime);
    m.nextStepTime += m.stepDur;
    m.step = (m.step + 1) % m.totalSteps;
  }
}

function stopScheduler(m: LiveMusic) {
  if (m.timer) clearInterval(m.timer);
  m.timer = null;
  m.playing = false;
}

function fade(m: LiveMusic, target: number, seconds: number) {
  try {
    const now = m.ctx.currentTime;
    m.out.gain.cancelScheduledValues(now);
    m.out.gain.setTargetAtTime(Math.max(0.0001, target), now, Math.max(0.02, seconds / 3));
  } catch {
    /* context closed */
  }
}

function loopLength(m: LiveMusic, def: TrackDef) {
  m.stepDur = stepSeconds(def.bpm);
  m.totalSteps = def.bars * 16;
}

/* ----------------------------------------------------------------- public */

/** Effective bus gain for a 0..1 level (never above a comfortable ceiling). */
export function musicBusGain(level: number): number {
  const l = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));
  if (l <= 0) return 0.0001;
  return Math.min(MUSIC_GAIN, MUSIC_GAIN * l);
}

export const MUSIC_MAX_GAIN = MUSIC_GAIN;

/** Creates the (silent) engine so the context exists before the first gesture. */
export function ensureMusic(theme: WorldTheme): boolean {
  const m = ensureEngine(theme);
  if (!m) return false;
  if (m.theme !== theme && !m.playing) {
    m.theme = theme;
    loopLength(m, TRACKS[theme] ?? TRACKS.classic);
  }
  return true;
}

export function isMusicPlaying(): boolean {
  return globalStore.__jlMusic?.playing === true;
}

export function currentMusicTheme(): WorldTheme | null {
  return globalStore.__jlMusic?.theme ?? null;
}

/** Live volume changes (0 mutes the bus). */
export function setMusicVolume(level: number) {
  const m = globalStore.__jlMusic;
  if (!m) return;
  fade(m, musicBusGain(level), 0.25);
}

/** Starts or resumes the loop. Call only from a user gesture. */
export function startMusic(theme: WorldTheme, volume: number) {
  if (typeof window === "undefined") return;
  const m = ensureEngine(theme);
  if (!m) return;

  if (m.theme !== theme) {
    setMusicTheme(theme, volume, true);
    return;
  }

  m.ctx.resume().catch(() => {});
  if (m.playing && m.timer) {
    setMusicVolume(volume);
    return;
  }
  loopLength(m, TRACKS[theme] ?? TRACKS.classic);
  m.playing = true;
  m.nextStepTime = m.ctx.currentTime + 0.12;
  m.timer = setInterval(() => tick(m), LOOKAHEAD_MS);
  fade(m, musicBusGain(volume), 0.6);
  tick(m);
}

/** Fades out and stops the loop; the AudioContext is kept for reuse. */
export function stopMusic() {
  const m = globalStore.__jlMusic;
  if (!m) return;
  stopScheduler(m);
  fade(m, 0.0001, 0.2);
}

/**
 * Switches world: the current loop fades out, the sequencer resets and the new
 * loop starts ~180ms later — tracks can never overlap.
 */
export function setMusicTheme(theme: WorldTheme, volume: number, shouldPlay: boolean) {
  const m = ensureEngine(theme);
  if (!m) return;
  if (!shouldPlay) {
    stopMusic();
    return;
  }
  if (m.theme === theme && m.playing && m.timer) {
    setMusicVolume(volume);
    return;
  }
  const changed = m.theme !== theme;
  stopScheduler(m);
  m.theme = theme;
  loopLength(m, TRACKS[theme] ?? TRACKS.classic);
  m.step = 0;
  m.ctx.resume().catch(() => {});
  if (changed) fade(m, 0.0001, 0.18);
  m.playing = true;
  m.nextStepTime = m.ctx.currentTime + (changed ? 0.24 : 0.08);
  m.timer = setInterval(() => tick(m), LOOKAHEAD_MS);
  fade(m, musicBusGain(volume), 0.55);
  tick(m);
}

/** "Theme music preview" for the Audio settings (returns to nothing afterwards). */
export function previewTheme(theme: WorldTheme, volume: number, ms = 8000) {
  setMusicTheme(theme, volume, true);
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const m = globalStore.__jlMusic;
    if (m && m.theme === theme) stopMusic();
  }, ms);
}
