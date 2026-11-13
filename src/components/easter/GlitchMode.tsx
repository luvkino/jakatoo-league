// ============================================================================
// GLITCH MODE — a few seconds of purely cosmetic screen chaos.
// The effect NEVER intercepts pointer events and only applies visual filters
// to <html>, so navigation, buttons and forms keep working normally the
// whole time. It always ends by itself.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { GLITCH_ERRORS } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";
import { useReducedMotion } from "./useReducedMotion";

interface GlitchBar {
  top: number;
  left: number;
  w: number;
  h: number;
  hue: number;
}

interface FakeError {
  msg: string;
  top: number;
  left: number;
}

function randBars(): GlitchBar[] {
  const n = 4 + Math.floor(Math.random() * 4);
  return Array.from({ length: n }, () => ({
    top: Math.random() * 92,
    left: Math.random() * 70,
    w: 15 + Math.random() * 70,
    h: 2 + Math.random() * 9,
    hue: Math.floor(Math.random() * 360),
  }));
}

function randErrors(): FakeError[] {
  const pick = () => GLITCH_ERRORS[Math.floor(Math.random() * GLITCH_ERRORS.length)]!;
  return [
    { msg: pick(), top: 8 + Math.random() * 18, left: 5 + Math.random() * 22 },
    { msg: pick(), top: 62 + Math.random() * 18, left: 45 + Math.random() * 22 },
  ];
}

export function GlitchMode({
  sfx,
  onDone,
}: {
  sfx: (k: EggSfxKind) => void;
  onDone: () => void;
}) {
  const [bars, setBars] = useState<GlitchBar[]>([]);
  const [errors, setErrors] = useState<FakeError[]>([]);
  const doneRef = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const totalMs = reduced ? 1600 : 4300;

    sfx("glitch");
    const kick = setTimeout(() => {
      setBars(randBars());
      setErrors(randErrors());
    }, 0);

    const barIv = setInterval(() => {
      setBars(randBars());
      if (Math.random() < 0.4) sfx("glitch");
    }, 420);
    const errIv = setInterval(() => setErrors(randErrors()), 1250);
    const done = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    }, totalMs);

    return () => {
      clearTimeout(kick);
      clearInterval(barIv);
      clearInterval(errIv);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {/* full-screen backdrop distortion (purely visual, no layout impact) */}
      {!reduced && <div className="egg-glitch-pane" />}

      {/* RGB split title */}
      <div className="absolute inset-x-0 top-[38%] flex justify-center">
        <div className="egg-glitch-title font-pixel-en text-center text-lg font-extrabold sm:text-3xl">
          GLITCH IN THE LEAGUE
        </div>
      </div>

      {/* Random pixel-displacement bars */}
      {bars.map((b, i) => (
        <div
          key={i}
          className="egg-glitch-bar absolute"
          style={{
            top: `${b.top}%`,
            left: `${b.left}%`,
            width: `${b.w}%`,
            height: `${b.h}px`,
            backdropFilter: `hue-rotate(${b.hue}deg) saturate(1.8) contrast(1.2)`,
          }}
        />
      ))}

      {/* Fake error windows (decorative, non-interactive) */}
      {errors.map((e, i) => (
        <div
          key={i}
          className="egg-fake-error absolute max-w-[15rem] border-2 border-bad bg-card px-2.5 py-2 font-pixel-en text-[10px] font-bold text-bad sm:text-xs"
          style={{ top: `${e.top}%`, left: `${e.left}%` }}
          dir="ltr"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span>■ ERROR</span>
            <span>X</span>
          </div>
          <span className="font-sans text-[11px] leading-snug" dir="rtl">
            {e.msg}
          </span>
        </div>
      ))}

      {/* Scanlines */}
      <div className="egg-scanlines absolute inset-0" />
    </div>
  );
}
