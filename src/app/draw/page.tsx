"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon } from "@/components/PixelArt";
import { Empty, PageTitle } from "@/components/ui";

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

/** Picks who deals the cards. Purely local: never touches matches, stats or achievements. */
export default function DrawPage() {
  const { activePlayers, loaded } = useLeague();
  const { sfx, triggerCelebration } = useChaos();
  const [off, setOff] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const [spinStep, setSpinStep] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const chosen = useMemo(() => activePlayers.filter((p) => !off.has(p.id)), [activePlayers, off]);

  function toggle(id: string) {
    if (spinning) return;
    setWinner(null);
    setOff((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function spin() {
    if (spinning) return;
    if (chosen.length < 2) return setErr("اختر لاعبَين على الأقل للمشاركة في القرعة.");
    setErr("");
    setWinner(null);
    setSpinning(true);
    const pool = chosen.map((p) => p.name);
    const target = randomInt(pool.length);
    const steps = 20 + randomInt(8);
    let i = 0;
    const tick = () => {
      i++;
      setSpinStep(i);
      if (i >= steps) {
        setShown(pool[target]);
        setWinner(pool[target]);
        setSpinning(false);
        triggerCelebration("draw");
        return;
      }
      sfx("drawTick");
      setShown(pool[randomInt(pool.length)]);
      timer.current = setTimeout(tick, 60 + i * i * 0.55);
    };
    tick();
  }

  return (
    <div className="stack">
      <PageTitle
        pixelIcon="dice"
        sub="اختر اللاعبين المشاركين، ثم اضغط للقرعة لمعرفة من سيوزّع الأوراق. لا يؤثر هذا على الإحصائيات أو الترتيب."
      >
        دق الولد
      </PageTitle>

      <div className="card text-center">
        <div className="mb-3 grid min-h-[170px] place-items-center border-2 border-line bg-bg p-4">
          {winner ? (
            <div className="reveal flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-muted">
                <PixelIcon name="crown" size={18} />
                <span>الموزّع هو</span>
              </div>
              <div className="my-1 flex items-center gap-3 font-pixel-ar text-5xl font-extrabold text-accent-text sm:text-6xl">
                <PixelIcon name="cards" size={40} />
                <span>{winner}</span>
              </div>
            </div>
          ) : spinning && shown ? (
            <div key={spinStep} className="rolling font-pixel-ar text-4xl font-extrabold sm:text-5xl">
              {shown}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-lg text-muted">
              <PixelIcon name="dice" size={36} />
              <span>اضغط «دق الولد» لبدء القرعة</span>
            </div>
          )}
        </div>
        {err && (
          <p role="alert" className="mb-2 text-sm font-bold text-bad">
            {err}
          </p>
        )}
        <button className="btn btn-primary w-full !min-h-[56px] text-lg" onClick={spin} disabled={spinning}>
          <PixelIcon name="dice" size={22} />
          <span>{spinning ? "جارٍ الدق…" : winner ? "إعادة القرعة" : "دق الولد"}</span>
        </button>
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
            <PixelIcon name="players" size={18} />
            <span>اللاعبون المشاركون</span>
            <span className="chip chip-accent tnum">
              {chosen.length} / {activePlayers.length}
            </span>
          </h2>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => !spinning && setOff(new Set())}>
              تحديد الكل
            </button>
            <button
              className="btn btn-sm"
              onClick={() => !spinning && setOff(new Set(activePlayers.map((p) => p.id)))}
            >
              إلغاء الكل
            </button>
          </div>
        </div>
        {!loaded ? (
          <div className="skel h-20 w-full" />
        ) : activePlayers.length === 0 ? (
          <Empty title="لا يوجد لاعبون بعد">
            <Link href="/players" className="btn btn-primary">
              أضف لاعبين
            </Link>
          </Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activePlayers.map((p) => {
              const on = !off.has(p.id);
              return (
                <button
                  key={p.id}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(p.id)}
                  className={`btn ${on ? "btn-primary" : "opacity-70"}`}
                >
                  {on ? "✓" : "○"} {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
