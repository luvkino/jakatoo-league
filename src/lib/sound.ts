// Optional 8-bit Web Audio API synthesizer.
// Disabled by default and never plays before user opt-in and user interaction.

export type SfxKind =
  | "click"
  | "victory"
  | "achievement"
  | "notification"
  | "leaderChange"
  | "lastPlace"
  | "explosion"
  | "rare"
  | "epic"
  | "legendary"
  | "drawTick"
  | "drawWin"
  | "cardShuffle"
  | "cardDraw"
  | "cardLand"
  | "cardFlip"
  | "cardMatch"
  | "teamReveal";

let ctx: AudioContext | null = null;
let unlocked = false;

/**
 * SFX bus level (0..1) driven by the Audio settings (master × SFX volume).
 * Every tone/noise below is scaled by this so the existing sounds keep working
 * exactly as before while respecting the new volume sliders.
 */
let sfxLevel = 1;

export function setSfxLevel(level: number) {
  const n = Number.isFinite(level) ? level : 1;
  sfxLevel = Math.min(1, Math.max(0, n));
}

export function getSfxLevel(): number {
  return sfxLevel;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function unlockAudio() {
  unlocked = true;
  getCtx();
}

function tone(
  ac: AudioContext,
  freq: number,
  duration: number,
  delay = 0,
  type: OscillatorType = "square",
  gainLevel = 0.08,
  endFreq?: number,
) {
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  }
  const level = gainLevel * sfxLevel;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(Math.max(0.00005, level), now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noiseBurst(ac: AudioContext, duration = 0.24, delay = 0, gainLevel = 0.1) {
  const sampleRate = ac.sampleRate;
  const len = Math.max(1, Math.floor(sampleRate * duration));
  const buf = ac.createBuffer(1, len, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    if (i % 4 === 0) data[i] = Math.random() * 2 - 1;
    else data[i] = data[i - 1];
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, ac.currentTime + delay);
  filter.frequency.exponentialRampToValueAtTime(140, ac.currentTime + delay + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(Math.max(0.00005, gainLevel * sfxLevel), ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(ac.currentTime + delay);
}

/** Card sounds fire in quick sequences; never let the same one overlap itself. */
const lastCardSfxAt = new Map<SfxKind, number>();
const CARD_SFX_MIN_GAP_MS = 90;

export function playSfx(kind: SfxKind, enabled: boolean) {
  // `enabled` is the app sound switch; `sfxLevel` is driven centrally by the
  // AudioManager (master x SFX sliders, forced to 0 by the global mute), so
  // card sounds respect the single global mute like every other bus.
  if (!enabled || !unlocked || sfxLevel <= 0.001) return;
  if (kind.startsWith("card") || kind === "teamReveal") {
    const now = performance.now();
    if (now - (lastCardSfxAt.get(kind) ?? -Infinity) < CARD_SFX_MIN_GAP_MS) return;
    lastCardSfxAt.set(kind, now);
  }
  const ac = getCtx();
  if (!ac || ac.state === "suspended") return;

  switch (kind) {
    case "click":
      tone(ac, 620, 0.04, 0, "square", 0.045, 860);
      break;
    case "drawTick":
      tone(ac, 440, 0.035, 0, "square", 0.04, 520);
      break;
    case "drawWin":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, 0.12, i * 0.08, "square", 0.07));
      break;
    case "notification":
      tone(ac, 587.33, 0.07, 0, "square", 0.055);
      tone(ac, 880, 0.09, 0.075, "square", 0.055);
      break;
    case "achievement":
      tone(ac, 987.77, 0.08, 0, "square", 0.07);
      tone(ac, 1318.51, 0.22, 0.085, "square", 0.075);
      break;
    case "victory":
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
        tone(ac, f, i === 4 ? 0.26 : 0.09, i * 0.08, "square", 0.07),
      );
      break;
    case "leaderChange":
      [392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ac, f, i === 4 ? 0.3 : 0.1, i * 0.09, "sawtooth", 0.055),
      );
      tone(ac, 261.63, 0.45, 0.18, "triangle", 0.08);
      break;
    case "lastPlace":
      tone(ac, 370, 0.14, 0, "sawtooth", 0.05, 355);
      tone(ac, 349, 0.14, 0.16, "sawtooth", 0.05, 330);
      tone(ac, 311, 0.28, 0.32, "sawtooth", 0.055, 240);
      break;
    case "explosion":
      noiseBurst(ac, 0.28, 0, 0.11);
      tone(ac, 150, 0.22, 0, "triangle", 0.1, 42);
      break;
    case "rare":
      [659.25, 880, 1174.66].forEach((f, i) => tone(ac, f, 0.12, i * 0.07, "square", 0.06));
      break;
    case "epic":
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((f, i) =>
        tone(ac, f, 0.13, i * 0.06, "square", 0.065),
      );
      noiseBurst(ac, 0.16, 0.02, 0.06);
      break;
    case "cardShuffle":
      // Original synthesized riffle: a few short filtered noise bursts.
      noiseBurst(ac, 0.1, 0, 0.07);
      noiseBurst(ac, 0.1, 0.14, 0.06);
      noiseBurst(ac, 0.12, 0.28, 0.07);
      noiseBurst(ac, 0.16, 0.44, 0.05);
      break;
    case "cardDraw":
      noiseBurst(ac, 0.07, 0, 0.055);
      tone(ac, 340, 0.06, 0, "triangle", 0.04, 520);
      break;
    case "cardLand":
      tone(ac, 150, 0.07, 0, "triangle", 0.07, 90);
      break;
    case "cardFlip":
      noiseBurst(ac, 0.05, 0, 0.05);
      tone(ac, 760, 0.05, 0.01, "square", 0.04, 980);
      break;
    case "cardMatch":
      [659.25, 880, 1318.51].forEach((f, i) => tone(ac, f, 0.1, i * 0.07, "square", 0.055));
      break;
    case "teamReveal":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, 0.12, i * 0.08, "square", 0.06));
      noiseBurst(ac, 0.14, 0.05, 0.04);
      break;
    case "legendary":
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) =>
        tone(ac, f, i >= 4 ? 0.28 : 0.1, i * 0.075, "square", 0.075),
      );
      [261.63, 392.0, 523.25].forEach((f, i) => tone(ac, f, 0.35, i * 0.14, "triangle", 0.08));
      noiseBurst(ac, 0.22, 0.05, 0.07);
      break;
  }
}
