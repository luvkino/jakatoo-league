// ============================================================================
// THE 1% EVENT — a very rare, purely visual joke that may appear when the
// website loads ("YOU HAVE BEEN SELECTED TO MANAGE THE LEAGUE").
// It changes nothing, blocks nothing, closes instantly, never interferes with
// loading, and never repeats within a browser session (plus a long cooldown).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { EggSprite } from "./eggArt";
import { onePercentShouldRoll } from "./eggData";
import {
  ONE_PERCENT_ACTIONS,
  ONE_PERCENT_ENDING,
  ONE_PERCENT_SUB,
  ONE_PERCENT_TITLE,
} from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";
import { readEggMeta, writeEggMeta } from "./eggStore";

const SESSION_KEY = "jl_egg_onepercent_session";

export function RareEvent({
  sfx,
  onDiscover,
  onToast,
  blocked,
}: {
  sfx: (k: EggSfxKind) => void;
  onDiscover: () => void;
  onToast: (msg: string) => void;
  blocked: boolean;
}) {
  const [active, setActive] = useState(false);
  const [ending, setEnding] = useState(false);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const triggeredRef = useRef(false);
  const lineIdRef = useRef(0);

  useEffect(() => {
    if (blocked) return; // never on top of an open secret
    let sessionSeen = false;
    try {
      sessionSeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      sessionSeen = false;
    }
    const meta = readEggMeta();
    const last = meta.onePercentLastAt ? Date.parse(meta.onePercentLastAt) : null;
    if (!onePercentShouldRoll({ sessionSeen, lastTriggeredAtMs: last, nowMs: Date.now() })) return;

    // mark the session immediately: the roll happens once per browser session,
    // so page navigation never re-rolls it
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode */
    }

    if (Math.random() >= 0.01) return;

    const t = setTimeout(() => {
      triggeredRef.current = true;
      setActive(true);
      sfx("alarm");
      onDiscover();
    }, 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // remember when it happened (long cooldown) + hard stop after 35s
  useEffect(() => {
    if (!active) return;
    const stop = setTimeout(() => close(), 35000);
    return () => clearTimeout(stop);
  }, [active]);

  function close() {
    if (triggeredRef.current) {
      writeEggMeta({ onePercentLastAt: new Date().toISOString() });
      triggeredRef.current = false;
    }
    setActive(false);
    setEnding(false);
    setConsoleLines([]);
  }

  function runAction(label: string, result: string) {
    sfx("error");
    setShake(true);
    setTimeout(() => setShake(false), 450);
    lineIdRef.current += 1;
    setConsoleLines((l) => [
      ...l.slice(-4),
      `> تنفيذ «${label}»…`,
      result,
    ]);
    if (lineIdRef.current >= 6) {
      // the management experience inevitably collapses into comedy
      setTimeout(() => setEnding(true), 900);
    }
  }

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-black/85 p-3 ${shake ? "chaos-shake" : ""}`}
      role="alertdialog"
      aria-modal="true"
      aria-label={ONE_PERCENT_TITLE}
    >
      <div className="egg-onepercent card relative w-full max-w-2xl !p-4">
        <button
          className="btn btn-sm absolute top-2 left-2 z-10 !min-h-[32px] !px-2"
          onClick={close}
          aria-label="إغلاق فوري"
        >
          ✕
        </button>

        {ending ? (
          <div className="stack items-center gap-3 py-6 text-center">
            <div className="reveal">
              <EggSprite name="eggCrown1" size={64} />
            </div>
            <div className="font-pixel-ar text-3xl font-extrabold">انتهى الاختبار!</div>
            <p className="max-w-md text-sm font-bold leading-relaxed">{ONE_PERCENT_ENDING}</p>
            <button className="btn btn-primary" onClick={close}>
              العودة إلى الواقع
            </button>
          </div>
        ) : (
          <div className="stack">
            <div className="text-center">
              <p className="font-pixel-en text-[11px] font-extrabold tracking-wider text-[#fde047] sm:text-sm" dir="ltr">
                {ONE_PERCENT_TITLE}
              </p>
              <h2 className="reveal mt-1 font-pixel-ar text-2xl font-extrabold sm:text-3xl">
                {ONE_PERCENT_SUB}
              </h2>
              <p className="mt-1 text-xs text-muted">
                فرصة نادرة 1% — لوحة تحكم حقيقية 0% 🎛️
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ONE_PERCENT_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  className="btn justify-start !text-xs sm:!text-sm"
                  onClick={() => runAction(a.label, a.result)}
                >
                  <EggSprite name="eggCrown1" size={16} />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>

            {consoleLines.length > 0 && (
              <div className="min-h-[5.2rem] border-2 border-line bg-black/70 p-2" aria-live="polite">
                {consoleLines.map((l, i) => (
                  <p key={i} className="font-pixel-en text-[10px] leading-relaxed text-[#4ade80] sm:text-xs" dir="auto">
                    {l}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                لا تقلق: لا شيء هنا يلمس الدوري الحقيقي.
              </span>
              <button className="btn btn-sm" onClick={() => setEnding(true)}>
                إنهاء الاختبار
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
