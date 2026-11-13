// ============================================================================
// EASTER EGG SFX — isolated 8-bit Web Audio synthesizer for the secret
// mini-games. Deliberately separate from src/lib/sound.ts so the existing
// league sound system stays untouched. Respects the same global mute flag
// (appearance.sound) that the caller passes in, and only ever plays after a
// real user interaction (codes are typed / buttons are clicked).
// ============================================================================

export type EggSfxKind =
  | "secret"
  | "card"
  | "chip"
  | "win"
  | "lose"
  | "push"
  | "glitch"
  | "ufo"
  | "laser"
  | "boot"
  | "type"
  | "error"
  | "bossHit"
  | "bossAttack"
  | "bossWin"
  | "bossLose"
  | "pet"
  | "alarm"
  | "mothership"
  | "matrix"
  | "achievement"
  | "stalker"
  | "notification"
  | "explosion";

let ctx: AudioContext | null = null;

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

function tone(
  ac: AudioContext,
  freq: number,
  duration: number,
  delay = 0,
  type: OscillatorType = "square",
  gainLevel = 0.06,
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

function noiseBurst(ac: AudioContext, duration = 0.2, delay = 0, gainLevel = 0.08, cutoff = 1200) {
  const sampleRate = ac.sampleRate;
  const len = Math.max(1, Math.floor(sampleRate * duration));
  const buf = ac.createBuffer(1, len, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    if (i % 4 === 0) data[i] = Math.random() * 2 - 1;
    else data[i] = data[i - 1] ?? 0;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, ac.currentTime + delay);
  filter.frequency.exponentialRampToValueAtTime(140, ac.currentTime + delay + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainLevel, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export function playEggSfx(kind: EggSfxKind, enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac || ac.state !== "running") return;

  switch (kind) {
    case "secret":
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
        tone(ac, f, i === 4 ? 0.22 : 0.09, i * 0.07, "square", 0.055),
      );
      break;
    case "card":
      noiseBurst(ac, 0.07, 0, 0.05, 3200);
      tone(ac, 320, 0.05, 0, "triangle", 0.04, 480);
      break;
    case "chip":
      tone(ac, 1150, 0.04, 0, "square", 0.05);
      tone(ac, 1500, 0.05, 0.05, "square", 0.05);
      break;
    case "win":
      [392, 523.25, 659.25, 783.99].forEach((f, i) =>
        tone(ac, f, i === 3 ? 0.24 : 0.09, i * 0.08, "square", 0.06),
      );
      break;
    case "lose":
      tone(ac, 392, 0.14, 0, "sawtooth", 0.05, 370);
      tone(ac, 330, 0.14, 0.15, "sawtooth", 0.05, 300);
      tone(ac, 262, 0.3, 0.3, "sawtooth", 0.055, 180);
      break;
    case "push":
      tone(ac, 494, 0.09, 0, "square", 0.05);
      tone(ac, 494, 0.09, 0.12, "square", 0.05);
      break;
    case "glitch":
      noiseBurst(ac, 0.18, 0, 0.09, 2400);
      tone(ac, 220, 0.12, 0, "sawtooth", 0.05, 90);
      tone(ac, 1300, 0.06, 0.1, "square", 0.04, 300);
      break;
    case "ufo":
      tone(ac, 620, 0.5, 0, "sine", 0.045, 880);
      tone(ac, 880, 0.5, 0.5, "sine", 0.045, 620);
      break;
    case "laser":
      tone(ac, 980, 0.16, 0, "sawtooth", 0.05, 140);
      break;
    case "boot":
      tone(ac, 262, 0.08, 0, "square", 0.05);
      tone(ac, 392, 0.08, 0.1, "square", 0.05);
      tone(ac, 523, 0.12, 0.2, "square", 0.05);
      break;
    case "type":
      tone(ac, 880, 0.02, 0, "square", 0.025);
      break;
    case "error":
      tone(ac, 180, 0.16, 0, "sawtooth", 0.06, 120);
      tone(ac, 180, 0.16, 0.2, "sawtooth", 0.06, 120);
      break;
    case "bossHit":
      noiseBurst(ac, 0.12, 0, 0.08, 1600);
      tone(ac, 200, 0.1, 0, "square", 0.06, 110);
      break;
    case "bossAttack":
      tone(ac, 300, 0.14, 0, "sawtooth", 0.055, 130);
      noiseBurst(ac, 0.1, 0.02, 0.05, 900);
      break;
    case "bossWin":
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) =>
        tone(ac, f, i >= 4 ? 0.3 : 0.1, i * 0.09, "square", 0.06),
      );
      noiseBurst(ac, 0.25, 0.1, 0.06);
      break;
    case "bossLose":
      [440, 392, 330, 262, 196].forEach((f, i) =>
        tone(ac, f, 0.16, i * 0.12, "triangle", 0.06),
      );
      break;
    case "pet":
      tone(ac, 740, 0.06, 0, "square", 0.045);
      tone(ac, 988, 0.09, 0.07, "square", 0.045);
      break;
    case "alarm":
      tone(ac, 700, 0.14, 0, "square", 0.05);
      tone(ac, 540, 0.14, 0.16, "square", 0.05);
      tone(ac, 700, 0.14, 0.32, "square", 0.05);
      break;
    case "mothership":
      tone(ac, 80, 1.1, 0, "triangle", 0.09, 55);
      tone(ac, 120, 1.1, 0.05, "sine", 0.06, 70);
      noiseBurst(ac, 0.7, 0.1, 0.05, 500);
      break;
    case "matrix":
      tone(ac, 660, 0.05, 0, "square", 0.03);
      tone(ac, 880, 0.05, 0.08, "square", 0.03);
      tone(ac, 440, 0.08, 0.16, "square", 0.03);
      break;
    case "achievement":
      tone(ac, 987.77, 0.08, 0, "square", 0.06);
      tone(ac, 1318.51, 0.22, 0.085, "square", 0.065);
      break;
    case "stalker":
      tone(ac, 196, 0.1, 0, "triangle", 0.04, 220);
      break;
    case "notification":
      tone(ac, 587.33, 0.07, 0, "square", 0.05);
      tone(ac, 880, 0.09, 0.075, "square", 0.05);
      break;
    case "explosion":
      noiseBurst(ac, 0.28, 0, 0.11);
      tone(ac, 150, 0.22, 0, "triangle", 0.1, 42);
      break;
  }
}
