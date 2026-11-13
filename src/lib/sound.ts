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
  | "drawWin";

let ctx: AudioContext | null = null;
let unlocked = false;

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
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainLevel, now + 0.008);
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
  gain.gain.setValueAtTime(gainLevel, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled || !unlocked) return;
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
    case "legendary":
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) =>
        tone(ac, f, i >= 4 ? 0.28 : 0.1, i * 0.075, "square", 0.075),
      );
      [261.63, 392.0, 523.25].forEach((f, i) => tone(ac, f, 0.35, i * 0.14, "triangle", 0.08));
      noiseBurst(ac, 0.22, 0.05, 0.07);
      break;
  }
}
