// ============================================================================
// UFO INVASION — temporary, purely decorative arcade event.
// UFOs fly across the screen, a mothership arrives, "steals the rankings"
// …as a joke. Nothing is read from or written to the real league data.
// The whole layer is pointer-events-none, so the site stays usable.
// ============================================================================

import { useEffect, useState } from "react";
import { MothershipSprite, UfoSprite } from "./eggArt";
import { ALIEN_TOASTS } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";
import { useReducedMotion } from "./useReducedMotion";

export interface AlienUfo {
  topPct: number;
  delayMs: number;
  durMs: number;
  rtl: boolean;
  scale: number;
}
export interface AlienConfig {
  ufos: AlienUfo[];
}

/** Randomized wave — always called from a user-gesture handler. */
export function makeAlienConfig(): AlienConfig {
  const ufos: AlienUfo[] = Array.from({ length: 8 }, () => ({
    topPct: 4 + Math.random() * 54,
    delayMs: Math.random() * 2600,
    durMs: 3600 + Math.random() * 3800,
    rtl: Math.random() > 0.5,
    scale: 0.7 + Math.random() * 0.9,
  }));
  return { ufos };
}

type Phase = "wave" | "mothership" | "beam";

export function AlienInvasion({
  config,
  sfx,
  onToast,
  onDone,
}: {
  config: AlienConfig;
  sfx: (k: EggSfxKind) => void;
  onToast: (msg: string) => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("wave");
  const reduced = useReducedMotion();

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    for (const t of ALIEN_TOASTS) at(() => onToast(t.msg), t.atMs);
    at(() => sfx("ufo"), 100);
    at(() => sfx("ufo"), 3200);
    at(() => sfx("laser"), 1900);
    at(() => sfx("laser"), 4300);
    at(() => sfx("laser"), 7700);
    at(() => {
      setPhase("mothership");
      sfx("mothership");
    }, 7300);
    at(() => setPhase("beam"), 9900);
    at(() => sfx("laser"), 10100);
    at(() => sfx("mothership"), 11000);
    at(() => onDone(), 14300);

    return () => {
      for (const t of timers) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[86] overflow-hidden" aria-hidden>
      {/* flying saucers */}
      {config.ufos.map((u, i) =>
        reduced ? (
          i === 0 ? (
            <div key={i} className="absolute left-1/2 top-1/3 -translate-x-1/2">
              <UfoSprite size={64} />
            </div>
          ) : null
        ) : (
          <div
            key={i}
            className="absolute left-0 will-change-transform"
            style={{
              top: `${u.topPct}%`,
              animation: `${u.rtl ? "egg-ufo-fly-rtl" : "egg-ufo-fly-ltr"} ${u.durMs}ms linear ${u.delayMs}ms both`,
            }}
          >
            <div style={{ transform: `scaleX(${u.rtl ? -1 : 1}) scale(${u.scale})` }}>
              <div className="egg-bob">
                <UfoSprite size={56} />
              </div>
            </div>
          </div>
        ),
      )}

      {/* mothership finale */}
      {phase !== "wave" && (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center">
          <div className={reduced ? "" : "egg-mothership"}>
            <div className="egg-bob">
              <MothershipSprite size={190} />
            </div>
          </div>
          {phase === "beam" && (
            <>
              <div className="egg-abduction-beam" />
              <div className="egg-abduction-flash" />
            </>
          )}
        </div>
      )}

      {/* subtle green invasion tint */}
      <div className="absolute inset-0 egg-invasion-tint" />
    </div>
  );
}
