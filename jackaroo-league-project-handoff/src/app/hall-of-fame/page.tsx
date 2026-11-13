"use client";

import { useMemo } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { Empty, PageTitle, PlayerLink, SectionTitle, Skeleton, fmtDay } from "@/components/ui";
import { computeHallOfFame, fmtRate, fmtSigned, type RecordEntry } from "@/lib/stats";

function Record({ title, icon, rows, fmt }: { title: string; icon: string; rows: RecordEntry[]; fmt: (r: RecordEntry) => string }) {
  return (
    <div className="card">
      <h3 className="mb-2 font-extrabold">{icon} {title}</h3>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-muted">لا توجد بيانات بعد.</p>
      ) : (
        <ol className="stack !gap-1">
          {rows.map((r, i) => (
            <li key={r.playerId} className="flex min-h-[40px] items-center gap-2 rounded-[var(--rs)] bg-card2 px-3">
              <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
              <PlayerLink id={r.playerId} className="min-w-0 flex-1 truncate" />
              <span className="tnum font-extrabold text-accent-text">{fmt(r)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function HallOfFamePage() {
  const { players, matches, seasons, loaded, nameOf } = useLeague();
  const hof = useMemo(() => computeHallOfFame(players, matches, seasons), [players, matches, seasons]);

  if (!loaded) return <div className="stack"><Skeleton className="h-10 w-48" /><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="stack">
      <PageTitle sub="كل الأرقام محسوبة من سجل المباريات الفعلي عبر كل المواسم.">🌟 قاعة المشاهير</PageTitle>

      <section>
        <SectionTitle>👑 أبطال المواسم</SectionTitle>
        {hof.champions.length === 0 ? (
          <div className="card"><Empty icon="🏆" title="لا يوجد أبطال بعد">يظهر البطل ووصيفه عند إغلاق موسم يحتوي على مباريات.</Empty></div>
        ) : (
          <div className="stack !gap-2">
            {hof.champions.map((c) => (
              <div key={c.season.id} className="card flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{c.season.name}</div>
                  <div className="text-xs text-muted">{c.season.endDate ? fmtDay(c.season.endDate) : ""} · {c.matches} مباراة</div>
                </div>
                {c.first && <div className="chip chip-accent !text-sm">🥇 {nameOf(c.first.id)} · {c.first.points} نقطة</div>}
                {c.second && <div className="chip !text-sm">🥈 {nameOf(c.second.id)} · {c.second.points} نقطة</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <Record title="أكثر الألقاب" icon="🏆" rows={hof.titles.slice(0, 3).map((t) => ({ playerId: t.playerId, value: t.titles }))} fmt={(r) => `${r.value} لقب`} />
        <Record title="أكثر نقاط الدوري" icon="⭐" rows={hof.mostPoints} fmt={(r) => `${r.value} نقطة`} />
        <Record title="أعلى نسبة فوز" icon="📈" rows={hof.bestWinRate} fmt={(r) => `${fmtRate(r.value)} (${r.games} مباراة)`} />
        <Record title="أفضل فارق أحجار" icon="🪨" rows={hof.bestStone} fmt={(r) => fmtSigned(r.value)} />
        <Record title="أطول سلسلة انتصارات" icon="🔥" rows={hof.longestWin} fmt={(r) => `${r.value} متتالية`} />
        <Record title="أكثر الانتصارات الساحقة" icon="💪" rows={hof.dominant} fmt={(r) => `${r.value} فوز`} />
        <Record title="أكثر انتصارات العودة" icon="🔄" rows={hof.comebacks} fmt={(r) => `${r.value} فوز`} />
        <div className="card">
          <h3 className="mb-2 font-extrabold">💞 أفضل شراكة تاريخية</h3>
          {hof.bestPairs.length === 0 ? (
            <p className="py-2 text-sm text-muted">لا توجد بيانات بعد.</p>
          ) : (
            <ol className="stack !gap-1">
              {hof.bestPairs.map((p, i) => (
                <li key={p.a + p.b} className="flex min-h-[40px] items-center gap-2 rounded-[var(--rs)] bg-card2 px-3 text-sm">
                  <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{nameOf(p.a)} + {nameOf(p.b)}</span>
                  <span className="tnum text-xs text-muted">{p.games} مباراة</span>
                  <span className="tnum font-extrabold text-accent-text">{fmtRate(p.winRate)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
