"use client";

import { useLeague } from "@/components/LeagueProvider";
import { MatchForm, MatchRow } from "@/components/Matches";
import { Empty, PageTitle, SectionTitle, Skeleton } from "@/components/ui";

export default function MatchesPage() {
  const { scopeMatches, loaded } = useLeague();
  const list = [...scopeMatches].reverse();
  return (
    <div className="stack">
      <PageTitle sub="أربعة لاعبين مختلفين، الفريق الفائز، وعدد الأحجار المتبقية مع الخاسر. لا يوجد تعادل.">🃏 المباريات</PageTitle>
      <div className="card">
        <SectionTitle>تسجيل مباراة جديدة</SectionTitle>
        <MatchForm />
      </div>
      <section>
        <SectionTitle extra={<span className="chip tnum">{list.length}</span>}>سجل المباريات</SectionTitle>
        {!loaded ? (
          <Skeleton className="h-28 w-full" />
        ) : list.length === 0 ? (
          <div className="card"><Empty icon="🎴" title="لا توجد مباريات في هذا النطاق بعد" /></div>
        ) : (
          <div className="stack !gap-2">
            {list.map((m) => <MatchRow key={m.id} m={m} editable />)}
          </div>
        )}
      </section>
    </div>
  );
}
