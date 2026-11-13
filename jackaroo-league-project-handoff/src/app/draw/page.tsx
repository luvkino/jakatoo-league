"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { Empty, PageTitle } from "@/components/ui";
import Link from "next/link";

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
  const [off, setOff] = useState<Set<string>>(new Set()); // deselected players (new players are included by default)
  const [shown, setShown] = useState<string | null>(null);
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
    const target = randomInt(pool.length); // only selected players are eligible
    const steps = 20 + randomInt(8);
    let i = 0;
    const tick = () => {
      i++;
      if (i >= steps) {
        setShown(pool[target]);
        setWinner(pool[target]);
        setSpinning(false);
        return;
      }
      setShown(pool[randomInt(pool.length)]);
      timer.current = setTimeout(tick, 60 + i * i * 0.55);
    };
    tick();
  }

  return (
    <div className="stack">
      <PageTitle sub="اختر اللاعبين المشاركين، ثم اضغط للقرعة لمعرفة من سيوزّع الأوراق. لا يؤثر هذا على الإحصائيات أو الترتيب.">🎲 دق الولد</PageTitle>

      <div className="card text-center">
        <div className="grid min-h-[150px] place-items-center">
          {winner ? (
            <div className="reveal">
              <div className="text-sm text-muted">الموزّع هو</div>
              <div className="my-1 text-5xl font-extrabold text-accent-text sm:text-6xl">🃏 {winner}</div>
            </div>
          ) : spinning && shown ? (
            <div key={shown + Math.random()} className="rolling text-4xl font-extrabold sm:text-5xl">{shown}</div>
          ) : (
            <div className="text-lg text-muted">اضغط «دق الولد» لبدء القرعة</div>
          )}
        </div>
        {err && <p role="alert" className="mb-2 text-sm font-bold text-bad">{err}</p>}
        <button className="btn btn-primary w-full !min-h-[56px] text-lg" onClick={spin} disabled={spinning}>
          {spinning ? "جارٍ الدق…" : winner ? "🔁 إعادة القرعة" : "🎲 دق الولد"}
        </button>
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold">اللاعبون المشاركون <span className="chip tnum">{chosen.length} / {activePlayers.length}</span></h2>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => !spinning && setOff(new Set())}>تحديد الكل</button>
            <button className="btn btn-sm" onClick={() => !spinning && setOff(new Set(activePlayers.map((p) => p.id)))}>إلغاء الكل</button>
          </div>
        </div>
        {!loaded ? (
          <div className="skel h-20 w-full" />
        ) : activePlayers.length === 0 ? (
          <Empty title="لا يوجد لاعبون بعد">
            <Link href="/players" className="btn btn-primary">أضف لاعبين</Link>
          </Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activePlayers.map((p) => {
              const on = !off.has(p.id);
              return (
                <button key={p.id} role="checkbox" aria-checked={on} onClick={() => toggle(p.id)} className={`btn ${on ? "btn-primary" : "opacity-70"}`}>
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
