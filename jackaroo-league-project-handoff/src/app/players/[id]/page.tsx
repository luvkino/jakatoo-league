"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { MatchRow } from "@/components/Matches";
import { Empty, Last5, PlayerLink, SectionTitle, Skeleton, StatBox, fmtDay, signTone } from "@/components/ui";
import { ACHIEVEMENTS, SMALL_SAMPLE, bestPairCmp, fmtAvg, fmtRate, fmtSigned, type PartnerStat } from "@/lib/stats";

const worstCmp = (a: PartnerStat, b: PartnerStat) =>
  (a.winRate ?? 0) - (b.winRate ?? 0) || b.games - a.games || a.stoneDiff - b.stoneDiff;

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { players, league, unlocks, scopeMatches, loaded, nameOf, scope, seasons } = useLeague();
  const player = players.find((p) => p.id === id);
  const s = league.stats.get(id);

  const partners = s?.partners ?? [];
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

  if (!loaded && !player)
    return (
      <div className="stack">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!player || !s)
    return (
      <div className="card">
        <Empty icon="🔍" title="لم يتم العثور على اللاعب">
          <Link href="/players" className="btn btn-primary">العودة إلى اللاعبين</Link>
        </Empty>
      </div>
    );

  const seasonName = seasons.find((x) => x.id === scope)?.name ?? "كل المواسم";

  return (
    <div className="stack">
      <div className="card flex flex-wrap items-center gap-3">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-accent text-3xl font-extrabold text-accent-fg">
          {player.name.trim().charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold">
            {player.name} {player.archived && <span className="chip">مؤرشف</span>}
          </h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted">
            <span className="chip chip-accent">{s.rank ? `المركز ${s.rank}` : "غير مصنّف"}</span>
            <span>{seasonName}</span>
            <span>· انضم {fmtDay(player.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatBox label="نقاط الدوري" value={s.points} tone="accent" />
        <StatBox label="نسبة الفوز" value={fmtRate(s.winRate)} />
        <StatBox label="فارق الأحجار" value={fmtSigned(s.stoneDiff)} tone={signTone(s.stoneDiff)} />
        <StatBox label="المباريات" value={s.games} />
        <StatBox label="الفوز" value={s.wins} tone="good" />
        <StatBox label="الخسارة" value={s.losses} tone="bad" />
        <StatBox label="متوسط الفارق" value={fmtAvg(s.avgStoneDiff)} tone={s.avgStoneDiff ? signTone(s.avgStoneDiff) : undefined} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <SectionTitle>🔥 السلاسل</SectionTitle>
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
          <SectionTitle>🤝 الشراكات</SectionTitle>
          {partners.length === 0 ? (
            <p className="text-sm text-muted">لم يلعب مع أي شريك بعد.</p>
          ) : (
            <ul className="stack !gap-2 text-sm">
              <PartnerLine label="أفضل شريك" p={best} />
              {worst ? <PartnerLine label="أسوأ شريك" p={worst} /> : null}
              <PartnerLine label="الشريك الأكثر تكراراً" p={frequent} />
              <li className="flex justify-between"><span className="text-muted">عدد الشركاء المختلفين</span><b className="tnum">{s.partnerCount}</b></li>
            </ul>
          )}
        </div>
      </div>

      {partners.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold">كل الشراكات ({partners.length})</summary>
          <div className="mt-3 stack !gap-1">
            {[...partners].sort((a, b) => b.games - a.games).map((p) => (
              <div key={p.partnerId} className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[var(--rs)] bg-card2 px-3 py-1 text-sm">
                <PlayerLink id={p.partnerId} className="min-w-0 flex-1 truncate" />
                {p.games < SMALL_SAMPLE && <span className="chip">عينة صغيرة</span>}
                <span className="tnum text-muted">{p.wins}ف / {p.losses}خ</span>
                <span className="tnum font-bold">{fmtRate(p.winRate)}</span>
                <span className={`tnum font-bold ${signTone(p.stoneDiff) === "good" ? "text-good" : signTone(p.stoneDiff) === "bad" ? "text-bad" : ""}`}>{fmtSigned(p.stoneDiff)}</span>
                <span className="tnum text-xs text-muted">متوسط {fmtAvg(p.avgStoneDiff)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <section className="card">
        <SectionTitle extra={<span className="chip tnum">{new Set(mine.map((u) => u.key)).size} / {ACHIEVEMENTS.length}</span>}>🏅 الإنجازات</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const got = mine.filter((u) => u.key === a.key).sort((x, y) => y.at.localeCompare(x.at));
            const on = got.length > 0;
            return (
              <div key={a.key} className={`flex items-center gap-3 rounded-[var(--rs)] border p-3 ${on ? "border-accent bg-accent/10" : "border-line opacity-50"}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl ${on ? "bg-accent/25" : "bg-card2 grayscale"}`}>{a.icon}</div>
                <div className="min-w-0">
                  <div className="font-extrabold leading-tight">{a.title}</div>
                  <div className="text-xs text-muted">{a.desc}</div>
                  {on && (
                    <div className="mt-0.5 text-[11px] font-bold text-accent-text">
                      فُتح {fmtDay(got[0].at)}{got.length > 1 ? ` · ×${got.length} مواسم` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>🕒 آخر المباريات</SectionTitle>
        {history.length === 0 ? (
          <div className="card"><Empty icon="🎴" title="لم يلعب هذا اللاعب أي مباراة بعد" /></div>
        ) : (
          <div className="stack !gap-2">{history.map((m) => <MatchRow key={m.id} m={m} />)}</div>
        )}
      </section>

      {opponents.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold">⚔️ المواجهات المباشرة ({opponents.length} خصم)</summary>
          <div className="mt-3 stack !gap-1">
            {opponents.map(([oid, h]) => (
              <div key={oid} className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[var(--rs)] bg-card2 px-3 py-1 text-sm">
                <Link href={`/head-to-head?a=${id}&b=${oid}`} className="min-w-0 flex-1 truncate font-bold hover:text-accent-text">{nameOf(oid)}</Link>
                <span className="tnum text-muted">{h.wins}ف / {h.losses}خ</span>
                <span className="tnum font-bold">{fmtRate(h.winRate)}</span>
                <span className="tnum font-bold">{fmtSigned(h.stoneDiff)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  function PartnerLine({ label, p }: { label: string; p: PartnerStat }) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-muted">{label}</span>
        <span className="flex items-center gap-2">
          <PlayerLink id={p.partnerId} />
          <span className="tnum text-xs text-muted">{fmtRate(p.winRate)} · {p.games} مباراة</span>
          {p.games < SMALL_SAMPLE && <span className="chip">عينة صغيرة</span>}
        </span>
      </li>
    );
  }
}
