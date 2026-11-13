"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { useLeague } from "@/components/LeagueProvider";
import { MatchRow } from "@/components/Matches";
import {
  PixelAchievementIcon,
  PixelAvatar,
  PixelCrownAnimated,
  PixelIcon,
  PixelMeter,
  PixelPiggyMascot,
} from "@/components/PixelArt";
import { useAppearance } from "@/components/Settings";
import { Empty, Last5, PlayerLink, SectionTitle, Skeleton, StatBox, fmtDay, signTone } from "@/components/ui";
import { getPlayerRpgProfile } from "@/lib/chaos";
import { ACHIEVEMENTS, SMALL_SAMPLE, bestPairCmp, fmtAvg, fmtRate, fmtSigned, type PartnerStat } from "@/lib/stats";
import { getPlayerSpecificTrashTalk } from "@/lib/trashTalk";

const worstCmp = (a: PartnerStat, b: PartnerStat) =>
  (a.winRate ?? 0) - (b.winRate ?? 0) || b.games - a.games || a.stoneDiff - b.stoneDiff;

function PartnerLine({ label, p }: { label: string; p: PartnerStat }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-1 border-b border-line/50 pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <PlayerLink id={p.partnerId} />
        <span className="tnum text-xs text-muted">
          {fmtRate(p.winRate)} · {p.games} مباراة
        </span>
        {p.games < SMALL_SAMPLE && <span className="chip">عينة صغيرة</span>}
      </span>
    </li>
  );
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { players, league, unlocks, scopeMatches, loaded, nameOf, scope, seasons } = useLeague();
  const { a } = useAppearance();
  const { spotlight, leaderTitle, leaderMsg, lastTitle, lastMsg, sfx } = useChaos();
  const [banterSeed, setBanterSeed] = useState(0);

  const player = players.find((p) => p.id === id);
  const s = league.stats.get(id);

  const partners = useMemo(() => s?.partners ?? [], [s]);
  const best = useMemo(() => [...partners].sort(bestPairCmp)[0], [partners]);
  const worst = useMemo(() => (partners.length > 1 ? [...partners].sort(worstCmp)[0] : undefined), [partners]);
  const frequent = useMemo(() => [...partners].sort((a, b) => b.games - a.games || bestPairCmp(a, b))[0], [partners]);
  const mine = useMemo(() => unlocks.filter((u) => u.playerId === id), [unlocks, id]);
  const history = useMemo(
    () => [...scopeMatches].filter((m) => m.t1.includes(id) || m.t2.includes(id)).reverse().slice(0, 10),
    [scopeMatches, id],
  );
  const opponents = useMemo(
    () => [...(league.h2h.get(id)?.entries() ?? [])].sort((a, b) => b[1].games - a[1].games),
    [league, id],
  );

  const isLeader = spotlight.leader?.id === id;
  const isLast = spotlight.lastPlace?.id === id && !isLeader;

  const rpg = useMemo(
    () => (s ? getPlayerRpgProfile(s, { isLeader, isLastPlace: isLast }) : null),
    [s, isLeader, isLast],
  );

  const playerBanter = useMemo(() => {
    if (!player || !a.trashTalk) return null;
    void banterSeed;
    return getPlayerSpecificTrashTalk(player, league, scopeMatches, nameOf);
  }, [player, a.trashTalk, banterSeed, league, scopeMatches, nameOf]);

  if (!loaded && !player)
    return (
      <div className="stack">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!player || !s || !rpg)
    return (
      <div className="card">
        <Empty pixelIcon="search" title="لم يتم العثور على اللاعب">
          <Link href="/players" className="btn btn-primary">
            العودة إلى اللاعبين
          </Link>
        </Empty>
      </div>
    );

  const seasonName = seasons.find((x) => x.id === scope)?.name ?? "كل المواسم";
  const chartResults = s.results.slice(-10);

  return (
    <div className="stack">
      {/* Retro RPG Character Sheet Hero Card */}
      <div
        className={`card flex flex-col gap-3 ${
          isLeader ? "leader-card-panel" : isLast ? "last-card-panel" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <PixelAvatar
            id={player.id}
            name={player.name}
            size={76}
            isLeader={isLeader}
            isLastPlace={isLast}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-pixel-ar text-3xl font-extrabold">{player.name}</h1>
              {player.archived && <span className="chip">مؤرشف</span>}
              {isLeader && (
                <span className="chip chip-legendary">
                  <PixelCrownAnimated size={15} /> {leaderTitle}
                </span>
              )}
              {isLast && (
                <span className="chip chip-bad">
                  <PixelPiggyMascot size={15} /> {lastTitle}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted">
              <span className="chip chip-accent">{s.rank ? `المركز #${s.rank}` : "غير مصنّف"}</span>
              <span className="chip font-pixel-en text-[11px] text-fg">LVL {rpg.level}</span>
              <span className="font-bold text-fg/90">{rpg.roleTitle}</span>
              <span>· {seasonName}</span>
              <span>· انضم {fmtDay(player.createdAt)}</span>
            </div>

            <div className="mt-2.5 max-w-sm">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-muted">
                <span>شريط الخبرة (XP)</span>
                <span className="font-pixel-en text-[10px]">{rpg.xpPct}%</span>
              </div>
              <PixelMeter value={rpg.xpPct} segments={12} tone={isLeader ? "accent" : isLast ? "bad" : "good"} />
            </div>
          </div>
        </div>

        {/* Leader or Last Place Banner */}
        {isLeader && (
          <div className="flex items-center gap-2.5 border-2 border-yellow-400/70 bg-yellow-400/10 px-3 py-2 text-xs sm:text-sm font-bold text-yellow-200">
            <PixelCrownAnimated size={22} />
            <span>{leaderMsg}</span>
          </div>
        )}
        {isLast && (
          <div className="flex items-center gap-2.5 border-2 border-pink-400/70 bg-pink-500/10 px-3 py-2 text-xs sm:text-sm font-bold text-pink-200">
            <PixelPiggyMascot size={22} />
            <span>
              <b>{lastTitle}:</b> {lastMsg}
            </span>
          </div>
        )}

        {/* Context-Aware LEAGUE TRASH TALK Bubble */}
        {a.trashTalk && playerBanter && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-line bg-card2 px-3 py-2 text-xs sm:text-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <PixelIcon name={playerBanter.rare ? "chaos" : "megaphone"} size={18} />
              <span className="font-bold">{playerBanter.text}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBanterSeed((x) => x + 1);
                sfx("notification");
              }}
              className="btn btn-sm !min-h-[30px] !px-2 text-xs"
            >
              تعليق آخر
            </button>
          </div>
        )}
      </div>

      {/* 7 Core Statistics */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatBox label="نقاط الدوري" value={s.points} tone="accent" />
        <StatBox label="نسبة الفوز" value={fmtRate(s.winRate)} />
        <StatBox label="فارق الأحجار" value={fmtSigned(s.stoneDiff)} tone={signTone(s.stoneDiff)} />
        <StatBox label="المباريات" value={s.games} />
        <StatBox label="الفوز" value={s.wins} tone="good" />
        <StatBox label="الخسارة" value={s.losses} tone="bad" />
        <StatBox
          label="متوسط الفارق"
          value={fmtAvg(s.avgStoneDiff)}
          tone={s.avgStoneDiff ? signTone(s.avgStoneDiff) : undefined}
        />
      </div>

      {/* RPG Attributes + Pixel Form Chart */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <SectionTitle pixelIcon="swords">سمات اللاعب (RPG)</SectionTitle>
          <div className="stack !gap-2.5">
            {rpg.attributes.map((attr) => (
              <div key={attr.key}>
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span>{attr.label}</span>
                  <span className="tnum text-muted">{attr.rawText}</span>
                </div>
                <PixelMeter value={attr.value} segments={10} tone={attr.tone} />
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-muted">تُحسب هذه المؤشرات البصرية تلقائياً من سجل المباريات الفعلي.</p>
        </div>

        <div className="card">
          <SectionTitle pixelIcon="chart">مخطط آخر المباريات (فارق الأحجار)</SectionTitle>
          {chartResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">لم يلعب هذا اللاعب بعد.</p>
          ) : (
            <div>
              <div className="flex h-32 items-end gap-1.5 border-b-2 border-line bg-bg p-2">
                {chartResults.map((res) => {
                  const heightPct = Math.max(18, Math.round((Math.max(1, res.stones) / 8) * 100));
                  return (
                    <div key={res.matchId} className="flex flex-1 flex-col items-center justify-end h-full gap-1">
                      <span className={`tnum text-[10px] font-extrabold ${res.win ? "text-good" : "text-bad"}`}>
                        {res.win ? `+${res.stones}` : `-${res.stones}`}
                      </span>
                      <div
                        className={`w-full border ${
                          res.win ? "border-good bg-good/75" : "border-bad bg-bad/75"
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${res.win ? "فوز" : "خسارة"} (${res.stones} أحجار)`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>الأقدم ← الأحدث</span>
                <span className="flex items-center gap-2">
                  <span className="text-good font-bold">■ فوز</span>
                  <span className="text-bad font-bold">■ خسارة</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streaks & Partnerships */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <SectionTitle pixelIcon="fire">السلاسل</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="سلسلة الفوز الحالية" value={s.curWin} tone="good" />
            <StatBox label="أطول سلسلة فوز" value={s.maxWin} tone="good" />
            <StatBox label="سلسلة الخسارة الحالية" value={s.curLose} tone="bad" />
            <StatBox label="أطول سلسلة خسارة" value={s.maxLose} tone="bad" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-muted">آخر 5 نتائج</span>
            <Last5 results={s.last5} />
          </div>
        </div>

        <div className="card">
          <SectionTitle pixelIcon="handshake">الشراكات</SectionTitle>
          {partners.length === 0 ? (
            <p className="text-sm text-muted">لم يلعب مع أي شريك بعد.</p>
          ) : (
            <ul className="stack !gap-2 text-sm">
              <PartnerLine label="أفضل شريك" p={best} />
              {worst ? <PartnerLine label="أسوأ شريك" p={worst} /> : null}
              <PartnerLine label="الشريك الأكثر تكراراً" p={frequent} />
              <li className="flex justify-between">
                <span className="text-muted">عدد الشركاء المختلفين</span>
                <b className="tnum">{s.partnerCount}</b>
              </li>
            </ul>
          )}
        </div>
      </div>

      {partners.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold">🤝 كل الشراكات ({partners.length})</summary>
          <div className="mt-3 stack !gap-1.5">
            {[...partners]
              .sort((a, b) => b.games - a.games)
              .map((p) => (
                <div
                  key={p.partnerId}
                  className="flex min-h-[44px] flex-wrap items-center gap-2 border-2 border-line bg-card2 px-3 py-1 text-sm"
                >
                  <PlayerLink id={p.partnerId} className="min-w-0 flex-1 truncate" />
                  {p.games < SMALL_SAMPLE && <span className="chip">عينة صغيرة</span>}
                  <span className="tnum text-muted">
                    {p.wins}ف / {p.losses}خ
                  </span>
                  <span className="tnum font-bold">{fmtRate(p.winRate)}</span>
                  <span
                    className={`tnum font-bold ${
                      signTone(p.stoneDiff) === "good"
                        ? "text-good"
                        : signTone(p.stoneDiff) === "bad"
                          ? "text-bad"
                          : ""
                    }`}
                  >
                    {fmtSigned(p.stoneDiff)}
                  </span>
                  <span className="tnum text-xs text-muted">متوسط {fmtAvg(p.avgStoneDiff)}</span>
                </div>
              ))}
          </div>
        </details>
      )}

      {/* Retro Pixel Achievement Icons */}
      <section className="card">
        <SectionTitle
          pixelIcon="trophy"
          extra={
            <span className="chip chip-accent tnum">
              {new Set(mine.map((u) => u.key)).size} / {ACHIEVEMENTS.length}
            </span>
          }
        >
          الإنجازات
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((ach) => {
            const got = mine.filter((u) => u.key === ach.key).sort((x, y) => y.at.localeCompare(x.at));
            const on = got.length > 0;
            return (
              <div
                key={ach.key}
                className={`flex items-center gap-3 border-2 p-3 ${
                  on
                    ? "border-accent bg-accent/10 shadow-[2px_2px_0_var(--pixel-shadow)]"
                    : "border-line bg-card2/40 opacity-55"
                }`}
              >
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center border-2 ${
                    on ? "border-accent bg-accent/20" : "border-line bg-bg"
                  }`}
                >
                  <PixelAchievementIcon achKey={ach.key} unlocked={on} size={28} />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold leading-tight">{ach.title}</div>
                  <div className="text-xs text-muted">{ach.desc}</div>
                  {on && (
                    <div className="mt-0.5 text-[11px] font-bold text-accent-text">
                      فُتح {fmtDay(got[0].at)}
                      {got.length > 1 ? ` · ×${got.length} مواسم` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle pixelIcon="cards">آخر المباريات</SectionTitle>
        {history.length === 0 ? (
          <div className="card">
            <Empty pixelIcon="cards" title="لم يلعب هذا اللاعب أي مباراة بعد" />
          </div>
        ) : (
          <div className="stack !gap-2">
            {history.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      {opponents.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold">⚔️ المواجهات المباشرة ({opponents.length} خصم)</summary>
          <div className="mt-3 stack !gap-1.5">
            {opponents.map(([oid, h]) => (
              <div
                key={oid}
                className="flex min-h-[44px] flex-wrap items-center gap-2 border-2 border-line bg-card2 px-3 py-1 text-sm"
              >
                <Link href={`/head-to-head?a=${id}&b=${oid}`} className="min-w-0 flex-1 truncate font-bold hover:text-accent-text">
                  {nameOf(oid)}
                </Link>
                <span className="tnum text-muted">
                  {h.wins}ف / {h.losses}خ
                </span>
                <span className="tnum font-bold">{fmtRate(h.winRate)}</span>
                <span className="tnum font-bold">{fmtSigned(h.stoneDiff)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
