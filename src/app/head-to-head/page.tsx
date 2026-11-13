"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { useLeague } from "@/components/LeagueProvider";
import { MatchRow } from "@/components/Matches";
import { PixelAvatar, PixelIcon } from "@/components/PixelArt";
import { Empty, PageTitle, SectionTitle, StatBox, signTone } from "@/components/ui";
import { fmtRate, fmtSigned, headToHead } from "@/lib/stats";

function H2HInner() {
  const { players, scopeMatches, nameOf } = useLeague();
  const { spotlight } = useChaos();
  const sp = useSearchParams();
  const [a, setA] = useState(sp.get("a") ?? "");
  const [b, setB] = useState(sp.get("b") ?? "");
  const res = useMemo(() => (a && b && a !== b ? headToHead(scopeMatches, a, b) : null), [scopeMatches, a, b]);

  const opts = (
    <>
      <option value="">اختر لاعباً…</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.archived ? " (مؤرشف)" : ""}
        </option>
      ))}
    </>
  );

  const aPct = res && res.games > 0 ? Math.round((res.aWins / res.games) * 100) : 50;

  return (
    <div className="stack">
      <PageTitle
        pixelIcon="swords"
        sub="المواجهات بين لاعبين كانا في فريقين متقابلين فقط. لا يُحتسب الزملاء كخصوم."
      >
        المواجهات المباشرة
      </PageTitle>

      <div className="card grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label className="label" htmlFor="h-a">
            اللاعب الأول
          </label>
          <select id="h-a" className="input" value={a} onChange={(e) => setA(e.target.value)}>
            {opts}
          </select>
        </div>
        <button
          className="btn"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="تبديل"
        >
          ⇄
        </button>
        <div>
          <label className="label" htmlFor="h-b">
            اللاعب الثاني
          </label>
          <select id="h-b" className="input" value={b} onChange={(e) => setB(e.target.value)}>
            {opts}
          </select>
        </div>
      </div>

      {a && b && a === b && (
        <p role="alert" className="text-sm font-bold text-bad">
          اختر لاعبين مختلفين.
        </p>
      )}

      {!res ? (
        <div className="card">
          <Empty pixelIcon="swords" title="اختر لاعبين لعرض نتيجة المواجهة" />
        </div>
      ) : res.games === 0 ? (
        <div className="card">
          <Empty pixelIcon="piggy" title="لم يتواجه هذان اللاعبان كخصمين بعد" />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div className="flex flex-col items-center gap-2 min-w-0">
                <PixelAvatar
                  id={a}
                  name={nameOf(a)}
                  size={56}
                  isLeader={spotlight.leader?.id === a}
                  isLastPlace={spotlight.lastPlace?.id === a}
                />
                <div className="w-full truncate text-lg font-extrabold">{nameOf(a)}</div>
                <div className="tnum text-4xl font-extrabold text-good">{res.aWins}</div>
              </div>

              <div className="flex flex-col items-center gap-1 px-2">
                <PixelIcon name="swords" size={28} />
                <span className="font-pixel-en text-sm font-bold text-accent-text">VS</span>
                <span className="text-xs text-muted">{res.games} مواجهة</span>
              </div>

              <div className="flex flex-col items-center gap-2 min-w-0">
                <PixelAvatar
                  id={b}
                  name={nameOf(b)}
                  size={56}
                  isLeader={spotlight.leader?.id === b}
                  isLastPlace={spotlight.lastPlace?.id === b}
                />
                <div className="w-full truncate text-lg font-extrabold">{nameOf(b)}</div>
                <div className="tnum text-4xl font-extrabold text-good">{res.bWins}</div>
              </div>
            </div>

            {/* Pixel Tug-of-War Win Ratio Bar */}
            <div className="mb-3 border-2 border-line bg-bg p-1">
              <div className="flex h-3 w-full">
                <div className="bg-good transition-all" style={{ width: `${aPct}%` }} />
                <div className="bg-accent transition-all" style={{ width: `${100 - aPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatBox label={`نسبة فوز ${nameOf(a)}`} value={fmtRate(res.aWinRate)} />
              <StatBox
                label={`فارق أحجار ${nameOf(a)}`}
                value={fmtSigned(res.aStoneDiff)}
                tone={signTone(res.aStoneDiff)}
              />
              <StatBox label={`نسبة فوز ${nameOf(b)}`} value={fmtRate(res.bWinRate)} />
            </div>
          </div>
          <SectionTitle pixelIcon="cards">المباريات المشتركة</SectionTitle>
          <div className="stack !gap-2">
            {res.matches.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function H2HPage() {
  return (
    <Suspense fallback={<div className="skel h-40 w-full" />}>
      <H2HInner />
    </Suspense>
  );
}
