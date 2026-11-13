"use client";

import Link from "next/link";
import { useChaos } from "@/components/ChaosEngine";
import { useLeague } from "@/components/LeagueProvider";
import {
  PixelAvatar,
  PixelCrownAnimated,
  PixelIcon,
  PixelMeter,
  PixelPiggyMascot,
} from "@/components/PixelArt";
import { useAppearance } from "@/components/Settings";
import { signTone } from "@/components/ui";
import { fmtRate, fmtSigned, type PStat } from "@/lib/stats";

function RankBadge({ rank, isLeader, isLast }: { rank: number; isLeader: boolean; isLast: boolean }) {
  if (isLeader) return <PixelCrownAnimated size={24} />;
  if (isLast) return <PixelPiggyMascot size={24} />;
  if (rank === 1) return <PixelIcon name="medal1" size={20} />;
  if (rank === 2) return <PixelIcon name="medal2" size={20} />;
  if (rank === 3) return <PixelIcon name="medal3" size={20} />;
  return <span className="font-pixel-en text-xs text-muted">{rank}</span>;
}

/** One unified pixel-art leaderboard: points, win rate and stone difference side by side. */
export default function Leaderboard({ rows, limit }: { rows: PStat[]; limit?: number }) {
  const { nameOf } = useLeague();
  const { a } = useAppearance();
  const { spotlight, leaderTitle, lastTitle } = useChaos();
  const list = limit ? rows.slice(0, limit) : rows;
  const leaderId = spotlight.leader?.id ?? null;
  const lastId = spotlight.lastPlace?.id ?? null;

  if (a.leaderboard === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2" data-testid="leaderboard">
        {list.map((r) => {
          const isLeader = r.id === leaderId;
          const isLast = r.id === lastId && !isLeader;
          const playerName = nameOf(r.id);
          return (
            <Link
              key={r.id}
              href={`/players/${r.id}`}
              className={`card chaos-player-card flex items-center gap-3 !p-3 hover:border-accent ${
                isLeader ? "leader-card-panel" : isLast ? "last-card-panel" : ""
              }`}
            >
              <PixelAvatar
                id={r.id}
                name={playerName}
                size={52}
                isLeader={isLeader}
                isLastPlace={isLast}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <RankBadge rank={r.rank} isLeader={isLeader} isLast={isLast} />
                  <span className="truncate text-base font-extrabold">{playerName}</span>
                  {isLeader && (
                    <span className="chip chip-legendary !text-[10px]">{leaderTitle}</span>
                  )}
                  {isLast && (
                    <span className="chip chip-bad !text-[10px]">{lastTitle}</span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1 text-xs">
                  <span className="chip chip-accent tnum">{r.points} نقطة</span>
                  <span className="chip tnum">{fmtRate(r.winRate)}</span>
                  <span
                    className={`chip tnum ${
                      signTone(r.stoneDiff) === "good"
                        ? "chip-good"
                        : signTone(r.stoneDiff) === "bad"
                          ? "chip-bad"
                          : ""
                    }`}
                  >
                    فارق {fmtSigned(r.stoneDiff)}
                  </span>
                  <span className="chip tnum">{r.wins} فوز</span>
                  <span className="chip tnum">{r.games} لعب</span>
                </div>

                {r.games > 0 && (
                  <div className="mt-2">
                    <PixelMeter
                      value={(r.winRate ?? 0) * 100}
                      segments={8}
                      tone={isLeader ? "accent" : isLast ? "bad" : "good"}
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card !p-2 sm:!p-3" data-testid="leaderboard">
      <div className="lb-row border-b-2 border-line px-1 pb-2 text-center text-[10px] font-extrabold leading-tight text-muted sm:text-xs">
        <span>#</span>
        <span className="text-start">اللاعب</span>
        <span>النقاط</span>
        <span>نسبة الفوز</span>
        <span>فارق الأحجار</span>
        <span>الفوز</span>
        <span>لعب</span>
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {list.map((r) => {
          const isLeader = r.id === leaderId;
          const isLast = r.id === lastId && !isLeader;
          const playerName = nameOf(r.id);

          return (
            <li
              key={r.id}
              className={`border-2 transition-colors ${
                isLeader
                  ? "leader-card-panel"
                  : isLast
                    ? "last-card-panel"
                    : "border-transparent border-b-line/60"
              }`}
            >
              <Link
                href={`/players/${r.id}`}
                className="lb-row px-1.5 py-2 text-center text-xs hover:bg-card2/70 sm:text-sm"
                style={{ minHeight: 48 }}
              >
                <span className="flex items-center justify-center font-extrabold">
                  <RankBadge rank={r.rank} isLeader={isLeader} isLast={isLast} />
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-start" title={playerName}>
                  <span className="truncate text-sm font-extrabold sm:text-base">{playerName}</span>
                  {isLeader && (
                    <span className="hidden shrink-0 border border-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-extrabold text-yellow-300 sm:inline-block">
                      {leaderTitle}
                    </span>
                  )}
                  {isLast && (
                    <span className="hidden shrink-0 border border-pink-400 bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-pink-300 sm:inline-block">
                      {lastTitle}
                    </span>
                  )}
                </span>
                <span className="tnum text-sm font-extrabold text-accent-text sm:text-base">{r.points}</span>
                <span className={`tnum ${r.winRate === null ? "text-muted" : ""}`}>{fmtRate(r.winRate)}</span>
                <span
                  className={`tnum font-bold ${
                    signTone(r.stoneDiff) === "good"
                      ? "text-good"
                      : signTone(r.stoneDiff) === "bad"
                        ? "text-bad"
                        : "text-muted"
                  }`}
                >
                  {fmtSigned(r.stoneDiff)}
                </span>
                <span className="tnum">{r.wins}</span>
                <span className="tnum">{r.games}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
