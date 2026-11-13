"use client";

import Link from "next/link";
import { useLeague } from "@/components/LeagueProvider";
import { useAppearance } from "@/components/Settings";
import { fmtRate, fmtSigned, type PStat } from "@/lib/stats";
import { signTone } from "@/components/ui";

const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : String(r));

/** One unified leaderboard: points, win rate and stone difference side by side. */
export default function Leaderboard({ rows, limit }: { rows: PStat[]; limit?: number }) {
  const { nameOf } = useLeague();
  const { a } = useAppearance();
  const list = limit ? rows.slice(0, limit) : rows;

  if (a.leaderboard === "cards") {
    return (
      <div className="grid gap-2 sm:grid-cols-2" data-testid="leaderboard">
        {list.map((r) => (
          <Link key={r.id} href={`/players/${r.id}`} className="card flex items-center gap-3 !p-3 hover:border-accent">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card2 text-lg font-extrabold">{medal(r.rank)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-extrabold">{nameOf(r.id)}</div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                <span className="chip chip-accent tnum">{r.points} نقطة</span>
                <span className="chip tnum">{fmtRate(r.winRate)}</span>
                <span className={`chip tnum ${signTone(r.stoneDiff) === "good" ? "chip-good" : signTone(r.stoneDiff) === "bad" ? "chip-bad" : ""}`}>
                  فارق {fmtSigned(r.stoneDiff)}
                </span>
                <span className="chip tnum">{r.wins} فوز</span>
                <span className="chip tnum">{r.games} لعب</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="card !p-2 sm:!p-3" data-testid="leaderboard">
      <div className="lb-row border-b border-line px-1 pb-2 text-center text-[10px] font-bold leading-tight text-muted sm:text-xs">
        <span>#</span>
        <span className="text-start">اللاعب</span>
        <span>النقاط</span>
        <span>نسبة الفوز</span>
        <span>فارق الأحجار</span>
        <span>الفوز</span>
        <span>لعب</span>
      </div>
      <ul>
        {list.map((r) => (
          <li key={r.id} className="border-b border-line/60 last:border-0">
            <Link href={`/players/${r.id}`} className="lb-row px-1 py-2.5 text-center text-xs hover:bg-card2 sm:text-sm" style={{ minHeight: 44 }}>
              <span className="font-extrabold">{medal(r.rank)}</span>
              <span className="truncate text-start text-sm font-bold sm:text-base" title={nameOf(r.id)}>
                {nameOf(r.id)}
              </span>
              <span className="tnum text-sm font-extrabold text-accent-text sm:text-base">{r.points}</span>
              <span className={`tnum ${r.winRate === null ? "text-muted" : ""}`}>{fmtRate(r.winRate)}</span>
              <span className={`tnum font-bold ${signTone(r.stoneDiff) === "good" ? "text-good" : signTone(r.stoneDiff) === "bad" ? "text-bad" : "text-muted"}`}>
                {fmtSigned(r.stoneDiff)}
              </span>
              <span className="tnum">{r.wins}</span>
              <span className="tnum">{r.games}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
