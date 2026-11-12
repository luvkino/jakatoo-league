"use client";

import Leaderboard from "@/components/Leaderboard";
import { useLeague } from "@/components/LeagueProvider";
import { Empty, PageTitle, Skeleton } from "@/components/ui";
import Link from "next/link";

export default function LeaderboardPage() {
  const { league, loaded, seasons, scope } = useLeague();
  const season = seasons.find((s) => s.id === scope);
  return (
    <div className="stack">
      <PageTitle sub="الترتيب: نقاط الدوري ثم نسبة الفوز ثم فارق الأحجار ثم عدد الانتصارات ثم متوسط فارق الأحجار ثم المواجهات المباشرة.">
        🏆 الترتيب — {season ? season.name : "كل المواسم"}
      </PageTitle>
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
