"use client";

import Link from "next/link";
import { useChaos } from "@/components/ChaosEngine";
import Leaderboard from "@/components/Leaderboard";
import { useLeague } from "@/components/LeagueProvider";
import { PixelCrownAnimated, PixelPiggyMascot } from "@/components/PixelArt";
import { Empty, PageTitle, Skeleton } from "@/components/ui";

export default function LeaderboardPage() {
  const { league, loaded, seasons, scope, nameOf } = useLeague();
  const { spotlight, leaderTitle, leaderMsg, lastTitle, lastMsg } = useChaos();
  const season = seasons.find((s) => s.id === scope);

  return (
    <div className="stack">
      <PageTitle
        pixelIcon="trophy"
        sub="الترتيب: نقاط الدوري ثم نسبة الفوز ثم فارق الأحجار ثم عدد الانتصارات ثم متوسط فارق الأحجار ثم المواجهات المباشرة."
      >
        الترتيب — {season ? season.name : "كل المواسم"}
      </PageTitle>

      {loaded && spotlight.leader && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="card leader-card-panel flex items-center gap-3 !p-3">
            <PixelCrownAnimated size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-accent-text">{leaderTitle}</div>
              <div className="truncate font-extrabold">{nameOf(spotlight.leader.id)}</div>
              <div className="text-xs text-muted">{leaderMsg}</div>
            </div>
            <span className="chip chip-accent tnum">{spotlight.leader.points} نقطة</span>
          </div>

          {spotlight.lastPlace && (
            <div className="card last-card-panel flex items-center gap-3 !p-3">
              <PixelPiggyMascot size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-bad">{lastTitle}</div>
                <div className="truncate font-extrabold">{nameOf(spotlight.lastPlace.id)}</div>
                <div className="text-xs text-muted">{lastMsg}</div>
              </div>
              <span className="chip chip-bad tnum">#{spotlight.lastPlace.rank}</span>
            </div>
          )}
        </div>
      )}

      {!loaded ? (
        <div className="stack">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : league.ranking.length === 0 ? (
        <div className="card">
          <Empty title="لا يوجد لاعبون بعد">
            <Link href="/players" className="btn btn-primary">
              أضف أول لاعب
            </Link>
          </Empty>
        </div>
      ) : (
        <>
          <Leaderboard rows={league.ranking} />
          <p className="text-xs text-muted">النقاط = عدد الانتصارات × 3 · اللاعبون الذين لم يلعبوا يظهرون في النهاية.</p>
        </>
      )}
    </div>
  );
}
