"use client";

import Link from "next/link";
import { useState } from "react";
import { useLeague } from "@/components/LeagueProvider";
import PlayerAdd from "@/components/PlayerAdd";
import { Empty, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import type { PlayerRec } from "@/lib/stats";

function PlayerItem({ p }: { p: PlayerRec }) {
  const { admin, league, matches, renamePlayer, setArchived, deletePlayer, toast } = useLeague();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const s = league.stats.get(p.id);
  const hasMatches = matches.some((m) => m.t1.includes(p.id) || m.t2.includes(p.id));

  async function save() {
    if (busy) return;
    setBusy(true);
    const r = await renamePlayer(p.id, name);
    setBusy(false);
    if (r.ok) {
      setEditing(false);
      setErr("");
      toast("✅ تم تعديل اسم اللاعب.", "ok");
    } else setErr(r.message);
  }
  async function archive(v: boolean) {
    if (v && !window.confirm(`أرشفة «${p.name}»؟\nستبقى مبارياته وإحصائياته في السجل التاريخي، ولن يظهر في اختيار لاعبي المباريات الجديدة.`)) return;
    setBusy(true);
    const r = await setArchived(p.id, v);
    setBusy(false);
    toast(r.ok ? (v ? "📦 تمت أرشفة اللاعب." : "✅ تمت استعادة اللاعب.") : r.message, r.ok ? "ok" : "err");
  }
  async function remove() {
    if (!window.confirm(`حذف «${p.name}» نهائياً؟ (لا توجد له مباريات)`)) return;
    setBusy(true);
    const r = await deletePlayer(p.id);
    setBusy(false);
    toast(r.ok ? "🗑️ تم حذف اللاعب." : r.message, r.ok ? "ok" : "err");
  }

  return (
    <li className="card !p-3" data-testid="player-item">
      {editing ? (
        <div className="stack !gap-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus />
          {err && <p role="alert" className="text-sm font-bold text-bad">{err}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>حفظ</button>
            <button className="btn btn-sm" onClick={() => { setEditing(false); setName(p.name); setErr(""); }}>إلغاء</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/players/${p.id}`} className="min-w-0 flex-1 truncate text-base font-extrabold hover:text-accent-text">
            {p.name}
            {p.archived && <span className="chip ms-2">مؤرشف</span>}
          </Link>
          <span className="chip tnum">{s?.games ?? 0} لعب</span>
          <span className="chip chip-accent tnum">{s?.points ?? 0} نقطة</span>
          {admin === "admin" && (
            <div className="flex gap-1">
              <button className="btn btn-sm" onClick={() => setEditing(true)} aria-label="تعديل الاسم">✏️</button>
              {p.archived ? (
                <button className="btn btn-sm" onClick={() => archive(false)} disabled={busy}>استعادة</button>
              ) : (
                <button className="btn btn-sm" onClick={() => archive(true)} disabled={busy} aria-label="أرشفة">📦</button>
              )}
              {!hasMatches && (
                <button className="btn btn-sm btn-danger" onClick={remove} disabled={busy} aria-label="حذف">🗑️</button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function PlayersPage() {
  const { players, loaded } = useLeague();
  const active = [...players].filter((p) => !p.archived).reverse(); // newest first
  const archived = players.filter((p) => p.archived);

  return (
    <div className="stack">
      <PageTitle sub="أضف اللاعبين بالاسم فقط. يُنشأ ملف اللاعب تلقائياً ويظهر فوراً في الترتيب واختيار المباريات. لا يوجد حد لعدد اللاعبين.">
        👥 اللاعبون
      </PageTitle>
      <PlayerAdd />
      <section>
        <SectionTitle extra={<span className="chip tnum" data-testid="active-count">{active.length}</span>}>اللاعبون النشطون</SectionTitle>
        {!loaded ? (
          <div className="stack !gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="card"><Empty title="لا يوجد لاعبون بعد">اكتب اسم أول لاعب في الأعلى.</Empty></div>
        ) : (
          <ul className="stack !gap-2">
            {active.map((p) => <PlayerItem key={p.id} p={p} />)}
          </ul>
        )}
      </section>
      {archived.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold">📦 اللاعبون المؤرشفون ({archived.length})</summary>
          <p className="my-2 text-sm text-muted">تبقى مبارياتهم وإحصائياتهم محفوظة في السجل التاريخي.</p>
          <ul className="stack !gap-2">
            {archived.map((p) => <PlayerItem key={p.id} p={p} />)}
          </ul>
        </details>
      )}
    </div>
  );
}
