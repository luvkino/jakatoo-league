"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import Leaderboard from "@/components/Leaderboard";
import { useLeague } from "@/components/LeagueProvider";
import { MatchForm, MatchRow } from "@/components/Matches";
import {
  PixelAchievementIcon,
  PixelAvatar,
  PixelCrownAnimated,
  PixelIcon,
  PixelMeter,
  PixelPiggyMascot,
} from "@/components/PixelArt";
import PlayerAdd from "@/components/PlayerAdd";
import { useAppearance } from "@/components/Settings";
import { Empty, Modal, PlayerLink, SectionTitle, Skeleton, Tabs, fmtDay, signTone } from "@/components/ui";
import { ACH_MAP, bestPairCmp, fmtRate, fmtSigned, SMALL_SAMPLE } from "@/lib/stats";

type Row = { id: string; main: string; barVal: number; barMax: number; sub?: string; tone?: "good" | "bad" | "accent" };

function TopList({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="stack !gap-1.5">
      {rows.map((r, i) => (
        <li key={r.id + i} className="border-2 border-line bg-card2 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-6 text-center font-pixel-en text-xs font-extrabold text-muted">
              {i === 0 ? <PixelIcon name="medal1" size={16} /> : i === 1 ? <PixelIcon name="medal2" size={16} /> : i === 2 ? <PixelIcon name="medal3" size={16} /> : i + 1}
            </span>
            <PlayerLink id={r.id} className="min-w-0 flex-1 truncate" />
            {r.sub && <span className="text-xs text-muted">{r.sub}</span>}
            <span
              className={`tnum font-extrabold ${
                r.tone === "good" ? "text-good" : r.tone === "bad" ? "text-bad" : "text-accent-text"
              }`}
            >
              {r.main}
            </span>
          </div>
          <div className="mt-1.5">
            <PixelMeter value={r.barVal} max={r.barMax} segments={10} tone={r.tone ?? "accent"} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Dashboard() {
  const { league, scopeMatches, unlocks, players, loaded, nameOf, admin } = useLeague();
  const { a } = useAppearance();
  const { spotlight, leaderTitle, leaderMsg, lastTitle, lastMsg } = useChaos();
  const [matchOpen, setMatchOpen] = useState(false);
  const [tab, setTab] = useState("points");

  const played = useMemo(() => league.ranking.filter((r) => r.games > 0), [league]);
  const sections = useMemo(() => {
    const pairs = [...league.pairs].sort(bestPairCmp).slice(0, 5);
    const ptsList = played.filter((p) => p.points > 0).slice(0, 5);
    const maxPts = Math.max(1, ...ptsList.map((p) => p.points));

    const wrList = [...played].sort((x, y) => (y.winRate ?? 0) - (x.winRate ?? 0) || y.games - x.games).slice(0, 5);
    const stoneList = [...played].sort((x, y) => y.stoneDiff - x.stoneDiff).slice(0, 5);
    const maxStone = Math.max(1, ...stoneList.map((p) => Math.abs(p.stoneDiff)));

    const winList = [...played].filter((p) => p.curWin > 0).sort((x, y) => y.curWin - x.curWin).slice(0, 5);
    const maxWin = Math.max(1, ...winList.map((p) => p.curWin));

    const loseList = [...played].filter((p) => p.curLose > 0).sort((x, y) => y.curLose - x.curLose).slice(0, 5);
    const maxLose = Math.max(1, ...loseList.map((p) => p.curLose));

    const stats = {
      points: ptsList.map((p) => ({
        id: p.id,
        main: `${p.points}`,
        barVal: p.points,
        barMax: maxPts,
        sub: "نقطة",
        tone: "accent" as const,
      })),
      winrate: wrList.map((p) => ({
        id: p.id,
        main: fmtRate(p.winRate),
        barVal: Math.round((p.winRate ?? 0) * 100),
        barMax: 100,
        sub: `${p.games} مباراة`,
        tone: "good" as const,
      })),
      stone: stoneList.map((p) => ({
        id: p.id,
        main: fmtSigned(p.stoneDiff),
        barVal: Math.max(0, p.stoneDiff),
        barMax: maxStone,
        tone: signTone(p.stoneDiff),
      })),
      win: winList.map((p) => ({
        id: p.id,
        main: `${p.curWin}`,
        barVal: p.curWin,
        barMax: maxWin,
        sub: "فوز متتالٍ",
        tone: "good" as const,
      })),
      lose: loseList.map((p) => ({
        id: p.id,
        main: `${p.curLose}`,
        barVal: p.curLose,
        barMax: maxLose,
        sub: "خسارة متتالية",
        tone: "bad" as const,
      })),
    };
    return { stats, pairs };
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
          <ul className="stack !gap-1.5">
            {recentUnlocks.map((u) => (
              <li
                key={`${u.seasonId}${u.playerId}${u.key}`}
                className="flex min-h-[46px] items-center gap-2.5 border-2 border-line bg-card2 px-3 py-1.5"
              >
                <PixelAchievementIcon achKey={u.key} unlocked size={24} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{ACH_MAP.get(u.key)?.title}</div>
                  <div className="truncate text-xs text-muted">
                    {nameOf(u.playerId)} · {fmtDay(u.at)}
                  </div>
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
          <ul className="stack !gap-1.5">
            {sections.pairs.map((p) => (
              <li
                key={p.a + p.b}
                className="flex min-h-[46px] items-center gap-2 border-2 border-line bg-card2 px-3 py-1.5 text-sm"
              >
                <PixelIcon name="handshake" size={18} />
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
  const leader = spotlight.leader;
  const lastPlace = spotlight.lastPlace;

  return (
    <div className="stack">
      {/* League Leader & Last Place Pixel Art Spotlight */}
      {loaded && leader && (
        <section className={`grid gap-3 ${lastPlace ? "md:grid-cols-2" : ""}`} aria-label="صدارة وقاع الدوري">
          {/* Leader Golden Pixel Card */}
          <Link
            href={`/players/${leader.id}`}
            className="card leader-card-panel chaos-player-card flex items-center gap-3 hover:brightness-105"
            data-testid="leader-spotlight"
          >
            <PixelAvatar id={leader.id} name={nameOf(leader.id)} size={60} isLeader />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <PixelCrownAnimated size={20} />
                <span className="chip chip-legendary !text-[11px]">{leaderTitle}</span>
                {spotlight.leaderGap > 0 && (
                  <span className="chip chip-accent tnum !text-[11px]">فارق +{spotlight.leaderGap}</span>
                )}
              </div>
              <div className="mt-1 truncate font-pixel-ar text-2xl font-extrabold text-accent-text">
                {nameOf(leader.id)}
              </div>
              <p className="mt-0.5 text-xs font-bold text-fg/85">{leaderMsg}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="chip chip-accent tnum">{leader.points} نقطة</span>
                <span className="chip tnum">{fmtRate(leader.winRate)}</span>
                <span className="chip tnum">{leader.wins} فوز</span>
              </div>
            </div>
          </Link>

          {/* Last Place Piggy Bank Card */}
          {lastPlace && (
            <Link
              href={`/players/${lastPlace.id}`}
              className="card last-card-panel chaos-player-card flex items-center gap-3 hover:brightness-105"
              data-testid="last-place-spotlight"
            >
              <PixelAvatar id={lastPlace.id} name={nameOf(lastPlace.id)} size={60} isLastPlace />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PixelPiggyMascot size={20} />
                  <span className="chip chip-bad !text-[11px]">{lastTitle}</span>
                  <span className="chip tnum !text-[11px]">المركز #{lastPlace.rank}</span>
                </div>
                <div className="mt-1 truncate font-pixel-ar text-2xl font-extrabold text-bad">
                  {nameOf(lastPlace.id)}
                </div>
                <p className="mt-0.5 text-xs font-bold text-fg/85">{lastMsg}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="chip tnum">{lastPlace.points} نقطة</span>
                  <span className="chip chip-bad tnum">{lastPlace.losses} خسارة</span>
                  <span className="chip tnum">فارق {fmtSigned(lastPlace.stoneDiff)}</span>
                </div>
              </div>
            </Link>
          )}
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <PlayerAdd compact />
        <div className="grid grid-cols-2 gap-2 md:w-72">
          <button className="btn btn-primary !min-h-[56px]" onClick={() => setMatchOpen(true)}>
            <PixelIcon name="cards" size={20} />
            <span>تسجيل مباراة</span>
          </button>
          <Link href="/draw" className="btn !min-h-[56px]">
            <PixelIcon name="dice" size={20} />
            <span>دق الولد</span>
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
          <Empty pixelIcon="cards" title="مرحباً بك في الدوري!">
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
            pixelIcon="trophy"
            extra={
              <Link href="/leaderboard" className="text-sm font-bold text-accent-text hover:underline">
                عرض الترتيب الكامل ←
              </Link>
            }
          >
            الترتيب
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
          pixelIcon="cards"
          extra={
            <Link href="/matches" className="text-sm font-bold text-accent-text hover:underline">
              كل المباريات ←
            </Link>
          }
        >
          آخر المباريات
        </SectionTitle>
        {!loaded ? (
          <Skeleton className="h-28 w-full" />
        ) : latest.length === 0 ? (
          <div className="card">
            <Empty pixelIcon="cards" title="لا توجد مباريات بعد">
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
        <SectionTitle pixelIcon="chart">إحصائيات وإنجازات</SectionTitle>
        {a.dashboard === "tabs" ? (
          <div className="card">
            <Tabs tabs={blocks.map((b) => ({ id: b.id, label: b.label }))} value={tab} onChange={setTab} />
            {blocks.find((b) => b.id === tab)?.body}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.id} className="card">
                <h3 className="mb-2 font-pixel-ar text-xl font-extrabold">{b.label}</h3>
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
