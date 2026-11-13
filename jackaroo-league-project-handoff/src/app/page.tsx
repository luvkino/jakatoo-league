"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Leaderboard from "@/components/Leaderboard";
import { useLeague } from "@/components/LeagueProvider";
import { MatchForm, MatchRow } from "@/components/Matches";
import PlayerAdd from "@/components/PlayerAdd";
import { useAppearance } from "@/components/Settings";
import { Empty, Modal, PlayerLink, SectionTitle, Skeleton, Tabs, fmtDay, signTone } from "@/components/ui";
import { ACH_MAP, bestPairCmp, fmtRate, fmtSigned, SMALL_SAMPLE } from "@/lib/stats";

type Row = { id: string; main: string; sub?: string; tone?: "good" | "bad" };

function TopList({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="stack !gap-1">
      {rows.map((r, i) => (
        <li key={r.id + i} className="flex min-h-[44px] items-center gap-2 rounded-[var(--rs)] bg-card2 px-3">
          <span className="w-5 text-center font-extrabold text-muted">{i + 1}</span>
          <PlayerLink id={r.id} className="min-w-0 flex-1 truncate" />
          {r.sub && <span className="text-xs text-muted">{r.sub}</span>}
          <span className={`tnum font-extrabold ${r.tone === "good" ? "text-good" : r.tone === "bad" ? "text-bad" : "text-accent-text"}`}>{r.main}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Dashboard() {
  const { league, scopeMatches, unlocks, players, loaded, nameOf, admin } = useLeague();
  const { a } = useAppearance();
  const [matchOpen, setMatchOpen] = useState(false);
  const [tab, setTab] = useState("points");

  const played = useMemo(() => league.ranking.filter((r) => r.games > 0), [league]);
  const sections = useMemo(() => {
    const pairRows: Row[] = [];
    const pairs = [...league.pairs].sort(bestPairCmp).slice(0, 5);
    const stats = {
      points: played.filter((p) => p.points > 0).slice(0, 5).map((p) => ({ id: p.id, main: `${p.points}`, sub: "نقطة" })),
      winrate: [...played]
        .sort((x, y) => (y.winRate ?? 0) - (x.winRate ?? 0) || y.games - x.games)
        .slice(0, 5)
        .map((p) => ({ id: p.id, main: fmtRate(p.winRate), sub: `${p.games} مباراة` })),
      stone: [...played]
        .sort((x, y) => y.stoneDiff - x.stoneDiff)
        .slice(0, 5)
        .map((p) => ({ id: p.id, main: fmtSigned(p.stoneDiff), tone: signTone(p.stoneDiff) })),
      win: [...played]
        .filter((p) => p.curWin > 0)
        .sort((x, y) => y.curWin - x.curWin)
        .slice(0, 5)
        .map((p) => ({ id: p.id, main: `${p.curWin}`, sub: "فوز متتالٍ", tone: "good" as const })),
      lose: [...played]
        .filter((p) => p.curLose > 0)
        .sort((x, y) => y.curLose - x.curLose)
        .slice(0, 5)
        .map((p) => ({ id: p.id, main: `${p.curLose}`, sub: "خسارة متتالية", tone: "bad" as const })),
    };
    return { stats, pairs, pairRows };
  }, [league, played]);

  const recentUnlocks = useMemo(() => [...unlocks].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 8), [unlocks]);
  const latest = useMemo(() => [...scopeMatches].reverse().slice(0, 5), [scopeMatches]);

  const blocks: { id: string; label: string; body: React.ReactNode }[] = [
    { id: "points", label: "الأعلى نقاطاً", body: <TopList rows={sections.stats.points} empty="لا توجد نقاط بعد." /> },
    { id: "winrate", label: "أعلى نسبة فوز", body: <TopList rows={sections.stats.winrate} empty="لم يلعب أحد بعد." /> },
    { id: "stone", label: "أفضل فارق أحجار", body: <TopList rows={sections.stats.stone} empty="لم يلعب أحد بعد." /> },
    { id: "win", label: "سلاسل الفوز", body: <TopList rows={sections.stats.win} empty="لا توجد سلاسل فوز حالياً." /> },
    { id: "lose", label: "سلاسل الخسارة", body: <TopList rows={sections.stats.lose} empty="لا توجد سلاسل خسارة حالياً." /> },
    {
      id: "ach",
      label: "إنجازات حديثة",
      body:
        recentUnlocks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">لا توجد إنجازات بعد. سجّل مباراة لتبدأ!</p>
        ) : (
          <ul className="stack !gap-1">
            {recentUnlocks.map((u) => (
              <li key={`${u.seasonId}${u.playerId}${u.key}`} className="flex min-h-[44px] items-center gap-2 rounded-[var(--rs)] bg-card2 px-3">
                <span className="text-xl">{ACH_MAP.get(u.key)?.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{ACH_MAP.get(u.key)?.title}</div>
                  <div className="truncate text-xs text-muted">{nameOf(u.playerId)} · {fmtDay(u.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        ),
    },
    {
      id: "pairs",
      label: "أفضل الثنائيات",
      body:
        sections.pairs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">لا توجد شراكات بعد.</p>
        ) : (
          <ul className="stack !gap-1">
            {sections.pairs.map((p) => (
              <li key={p.a + p.b} className="flex min-h-[44px] items-center gap-2 rounded-[var(--rs)] bg-card2 px-3 text-sm">
                <div className="min-w-0 flex-1 truncate font-bold">
                  {nameOf(p.a)} + {nameOf(p.b)}
                </div>
                {p.games < SMALL_SAMPLE && <span className="chip">عينة صغيرة</span>}
                <span className="text-xs text-muted tnum">{p.games} مباراة</span>
                <span className="tnum font-extrabold text-accent-text">{fmtRate(p.winRate)}</span>
              </li>
            ))}
          </ul>
        ),
    },
  ];

  const empty = loaded && players.length === 0;

  return (
    <div className="stack">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <PlayerAdd compact />
        <div className="grid grid-cols-2 gap-2 md:w-72">
          <button className="btn btn-primary !min-h-[56px]" onClick={() => setMatchOpen(true)}>
            🃏 تسجيل مباراة
          </button>
          <Link href="/draw" className="btn !min-h-[56px]">
            🎲 دق الولد
          </Link>
        </div>
      </div>

      {!loaded ? (
        <div className="card stack">
          <Skeleton className="h-6 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : empty ? (
        <div className="card">
          <Empty icon="🃏" title="مرحباً بك في الدوري!">
            <p className="w-full">لا يوجد لاعبون بعد. ابدأ بإضافة أول لاعب ثم سجّل أول مباراة.</p>
            {admin === "admin" ? (
              <>
                <button className="btn btn-primary" onClick={() => document.getElementById("new-player-quick")?.focus()}>
                  ➕ أضف أول لاعب
                </button>
                <button className="btn" onClick={() => setMatchOpen(true)}>
                  🃏 سجّل أول مباراة
                </button>
              </>
            ) : (
              <p className="w-full">سجّل الدخول كمشرف لإضافة اللاعبين.</p>
            )}
          </Empty>
        </div>
      ) : (
        <section>
          <SectionTitle
            extra={
              <Link href="/leaderboard" className="text-sm font-bold text-accent-text">
                عرض الترتيب الكامل ←
              </Link>
            }
          >
            🏆 الترتيب
          </SectionTitle>
          {league.ranking.length === 0 ? (
            <div className="card">
              <Empty title="لا يوجد لاعبون في هذا الموسم" />
            </div>
          ) : (
            <Leaderboard rows={league.ranking} limit={8} />
          )}
        </section>
      )}

      <section>
        <SectionTitle
          extra={
            <Link href="/matches" className="text-sm font-bold text-accent-text">
              كل المباريات ←
            </Link>
          }
        >
          🕒 آخر المباريات
        </SectionTitle>
        {!loaded ? (
          <Skeleton className="h-28 w-full" />
        ) : latest.length === 0 ? (
          <div className="card">
            <Empty icon="🎴" title="لا توجد مباريات بعد">
              <button className="btn btn-primary" onClick={() => setMatchOpen(true)}>
                سجّل أول مباراة
              </button>
            </Empty>
          </div>
        ) : (
          <div className="stack !gap-2">
            {latest.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>📊 إحصائيات وإنجازات</SectionTitle>
        {a.dashboard === "tabs" ? (
          <div className="card">
            <Tabs tabs={blocks.map((b) => ({ id: b.id, label: b.label }))} value={tab} onChange={setTab} />
            {blocks.find((b) => b.id === tab)?.body}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.id} className="card">
                <h3 className="mb-2 font-extrabold">{b.label}</h3>
                {b.body}
              </div>
            ))}
          </div>
        )}
      </section>

      {matchOpen && (
        <Modal title="تسجيل مباراة" onClose={() => setMatchOpen(false)}>
          <MatchForm onDone={() => setMatchOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
