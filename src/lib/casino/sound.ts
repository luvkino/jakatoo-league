/**
 * CASINO SOUND — a dedicated 8-bit SFX synth for the casino.
 *
 * Independent from the league SFX bus so the casino can be muted on its own
 * (Casino → Settings → Sound). Everything is synthesised locally with the Web
 * Audio API: no audio files, no licences, no network requests.
 *
 * The engine also throttles identical sounds (max 1 per 45 ms) so dealing a
 * five-hand split never turns into a burst of clipped noise.
 */

export type CasinoSfx =
  | "cardDeal"
  | "cardFlip"
  | "chipPlace"
  | "chipCollect"
  | "win"
  | "lose"
  | "push"
  | "blackjack"
  | "dealerBust"
  | "button"
  | "shuffle"
  | "bet";

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.7;
/** Global mute driven by the central audio manager (master volume = 0). */
let globalMuted = false;
const lastPlayed = new Map<CasinoSfx, number>();

const THROTTLE_MS: Partial<Record<CasinoSfx, number>> = {
  cardDeal: 45,
  cardFlip: 60,
  chipPlace: 40,
  chipCollect: 50,
  button: 55,
};

export function setCasinoSoundEnabled(on: boolean) {
  enabled = on;
}

/** Central global mute — silences the casino bus too (master volume = 0). */
export function setCasinoGlobalMuted(muted: boolean) {
  globalMuted = !!muted;
}

export function setCasinoVolume(v: number) {
  volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.7));
}

export function casinoSoundEnabled(): boolean {
  return enabled && volume > 0;
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
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Exposed so a real click can unlock audio before the first sound. */
export function unlockCasinoAudio() {
  getCtx();
}

function tone(
  ac: AudioContext,
  at: number,
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.18,
  slideTo?: number,
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function noise(ac: AudioContext, at: number, dur: number, gain: number, highpass: number) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(at);
}

/** Plays one casino sound effect. Safe to call from any event handler. */
export function playCasinoSfx(kind: CasinoSfx) {
  if (!enabled || globalMuted || volume <= 0) return;
  const ac = getCtx();
  if (!ac) return;
  const now = performance.now();
  const throttle = THROTTLE_MS[kind];
  if (throttle) {
    const last = lastPlayed.get(kind) ?? 0;
    if (now - last < throttle) return;
  }
  lastPlayed.set(kind, now);

  const at = ac.currentTime + 0.01;
  const v = volume;

  switch (kind) {
    case "cardDeal":
      noise(ac, at, 0.07, 0.1 * v, 2600);
      tone(ac, at, 720, 0.05, "triangle", 0.08 * v, 420);
      break;
    case "cardFlip":
      noise(ac, at, 0.05, 0.09 * v, 3400);
      tone(ac, at, 980, 0.06, "square", 0.05 * v, 640);
      break;
    case "chipPlace":
      tone(ac, at, 1180, 0.035, "triangle", 0.11 * v, 880);
      tone(ac, at + 0.03, 760, 0.05, "triangle", 0.08 * v, 560);
      break;
    case "chipCollect":
      [0, 0.045, 0.09].forEach((d, i) => tone(ac, at + d, 880 + i * 120, 0.05, "triangle", 0.09 * v));
      break;
    case "bet":
      tone(ac, at, 520, 0.05, "square", 0.1 * v, 700);
      break;
    case "button":
      tone(ac, at, 680, 0.035, "square", 0.07 * v, 820);
      break;
    case "shuffle":
      for (let i = 0; i < 5; i++) noise(ac, at + i * 0.045, 0.05, 0.06 * v, 2400);
      break;
    case "win":
      [523, 659, 784, 1046].forEach((f, i) => tone(ac, at + i * 0.07, f, 0.14, "square", 0.14 * v));
      break;
    case "blackjack":
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
        tone(ac, at + i * 0.065, f, 0.18, "square", 0.15 * v),
      );
      noise(ac, at + 0.42, 0.3, 0.05 * v, 5200);
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(ac, at + i * 0.1, f, 0.16, "triangle", 0.11 * v));
      break;
    case "push":
      [440, 440].forEach((f, i) => tone(ac, at + i * 0.11, f, 0.1, "triangle", 0.09 * v));
      break;
    case "dealerBust":
      tone(ac, at, 300, 0.12, "square", 0.12 * v, 180);
      noise(ac, at + 0.1, 0.22, 0.08 * v, 1200);
      break;
  }
}
