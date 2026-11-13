"use client";

import { useMemo } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";
import { Empty, PageTitle, PlayerLink, SectionTitle, Skeleton, fmtDay } from "@/components/ui";
import { computeHallOfFame, fmtRate, fmtSigned, type RecordEntry } from "@/lib/stats";

function Record({
  title,
  icon,
  rows,
  fmt,
}: {
  title: string;
  icon: PixelIconName;
  rows: RecordEntry[];
  fmt: (r: RecordEntry) => string;
}) {
  return (
    <div className="card">
      <h3 className="mb-2.5 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
        <PixelIcon name={icon} size={20} />
        <span>{title}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-muted">لا توجد بيانات بعد.</p>
      ) : (
        <ol className="stack !gap-1.5">
          {rows.map((r, i) => (
            <li
              key={r.playerId}
              className={`flex min-h-[42px] items-center gap-2 border-2 px-3 ${
                i === 0 ? "border-accent/60 bg-accent/10" : "border-line bg-card2"
              }`}
            >
              <PixelIcon name={i === 0 ? "medal1" : i === 1 ? "medal2" : "medal3"} size={18} />
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

  if (!loaded)
    return (
      <div className="stack">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  return (
    <div className="stack">
      <PageTitle pixelIcon="star" sub="كل الأرقام محسوبة من سجل المباريات الفعلي عبر كل المواسم.">
        قاعة المشاهير
      </PageTitle>

      <section>
        <SectionTitle pixelIcon="crown">أبطال المواسم</SectionTitle>
        {hof.champions.length === 0 ? (
          <div className="card">
            <Empty pixelIcon="trophy" title="لا يوجد أبطال بعد">
              يظهر البطل ووصيفه عند إغلاق موسم يحتوي على مباريات.
            </Empty>
          </div>
        ) : (
          <div className="stack !gap-2">
            {hof.champions.map((c) => (
              <div key={c.season.id} className="card leader-card-panel flex flex-wrap items-center gap-3">
                <PixelIcon name="trophy" size={28} />
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{c.season.name}</div>
                  <div className="text-xs text-muted">
                    {c.season.endDate ? fmtDay(c.season.endDate) : ""} · {c.matches} مباراة
                  </div>
                </div>
                {c.first && (
                  <div className="chip chip-legendary !text-sm">
                    <PixelIcon name="medal1" size={14} /> {nameOf(c.first.id)} · {c.first.points} نقطة
                  </div>
                )}
                {c.second && (
                  <div className="chip !text-sm">
                    <PixelIcon name="medal2" size={14} /> {nameOf(c.second.id)} · {c.second.points} نقطة
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <Record
          title="أكثر الألقاب"
          icon="crown"
          rows={hof.titles.slice(0, 3).map((t) => ({ playerId: t.playerId, value: t.titles }))}
          fmt={(r) => `${r.value} لقب`}
        />
        <Record title="أكثر نقاط الدوري" icon="star" rows={hof.mostPoints} fmt={(r) => `${r.value} نقطة`} />
        <Record
          title="أعلى نسبة فوز"
          icon="chart"
          rows={hof.bestWinRate}
          fmt={(r) => `${fmtRate(r.value)} (${r.games} مباراة)`}
        />
        <Record title="أفضل فارق أحجار" icon="stone" rows={hof.bestStone} fmt={(r) => fmtSigned(r.value)} />
        <Record title="أطول سلسلة انتصارات" icon="fire" rows={hof.longestWin} fmt={(r) => `${r.value} متتالية`} />
        <Record title="أكثر الانتصارات الساحقة" icon="swords" rows={hof.dominant} fmt={(r) => `${r.value} فوز`} />
        <Record title="أكثر انتصارات العودة" icon="comeback" rows={hof.comebacks} fmt={(r) => `${r.value} فوز`} />
        <div className="card">
          <h3 className="mb-2.5 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
            <PixelIcon name="handshake" size={20} />
            <span>أفضل شراكة تاريخية</span>
          </h3>
          {hof.bestPairs.length === 0 ? (
            <p className="py-2 text-sm text-muted">لا توجد بيانات بعد.</p>
          ) : (
            <ol className="stack !gap-1.5">
              {hof.bestPairs.map((p, i) => (
                <li
                  key={p.a + p.b}
                  className={`flex min-h-[42px] items-center gap-2 border-2 px-3 text-sm ${
                    i === 0 ? "border-accent/60 bg-accent/10" : "border-line bg-card2"
                  }`}
                >
                  <PixelIcon name={i === 0 ? "medal1" : i === 1 ? "medal2" : "medal3"} size={18} />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {nameOf(p.a)} + {nameOf(p.b)}
                  </span>
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
