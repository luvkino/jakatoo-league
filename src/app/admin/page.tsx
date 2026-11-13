"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon } from "@/components/PixelArt";
import { LoginButton } from "@/components/Shell";
import { Empty, PageTitle, SectionTitle, Skeleton, fmtDate } from "@/components/ui";
import { AUDIT_LABELS, call } from "@/lib/client";

interface Entry {
  id: number;
  action: string;
  entity: string;
  admin: string;
  previous: unknown;
  next: unknown;
  at: string;
}
interface Summary {
  players: number;
  seasons: number;
  matches: number;
}

export default function AdminPage() {
  const { admin, players, matches, seasons, refresh, toast } = useLeague();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [auditErr, setAuditErr] = useState("");
  const [file, setFile] = useState<{ name: string; data: unknown } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAudit = useCallback(async () => {
    const r = await call<{ entries: Entry[] }>("/api/audit", undefined, 1);
    if (r.ok) {
      setEntries(r.entries);
      setAuditErr("");
    } else setAuditErr(r.message);
  }, []);

  useEffect(() => {
    if (admin !== "admin") return;
    let active = true;
    call<{ entries: Entry[] }>("/api/audit", undefined, 1).then((r) => {
      if (!active) return;
      if (r.ok) {
        setEntries(r.entries);
        setAuditErr("");
      } else {
        setAuditErr(r.message);
      }
    });
    return () => {
      active = false;
    };
  }, [admin]);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setSummary(null);
    setFile(null);
    setMsg(null);
    if (!f) return;
    let data: unknown;
    try {
      data = JSON.parse(await f.text());
    } catch {
      return setMsg({ ok: false, text: "الملف ليس ملف JSON صالحاً." });
    }
    setBusy(true);
    const r = await call<{ summary: Summary }>("/api/import", { method: "POST", body: { data, confirm: false } });
    setBusy(false);
    if (r.ok) {
      setFile({ name: f.name, data });
      setSummary(r.summary);
    } else setMsg({ ok: false, text: r.message });
  }

  async function restore() {
    if (!file || busy) return;
    if (
      !window.confirm(
        "سيتم استبدال جميع اللاعبين والمواسم والمباريات الحالية بمحتوى الملف. هل أنت متأكد؟ (يُنصح بتنزيل نسخة احتياطية أولاً)",
      )
    )
      return;
    setBusy(true);
    const r = await call("/api/import", { method: "POST", body: { data: file.data, confirm: true } });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: "تمت استعادة البيانات بنجاح." });
      toast("✅ تمت استعادة النسخة الاحتياطية.", "ok");
      setFile(null);
      setSummary(null);
      await refresh();
      loadAudit();
    } else setMsg({ ok: false, text: r.message });
  }

  if (admin === "unknown") return <Skeleton className="h-40 w-full" />;
  if (admin === "viewer")
    return (
      <div className="card">
        <Empty pixelIcon="lock" title="هذه الصفحة للمشرف فقط">
          <LoginButton />
        </Empty>
      </div>
    );

  const brief = (v: unknown) => {
    if (v === null || v === undefined) return "—";
    const s = JSON.stringify(v);
    return s.length > 160 ? s.slice(0, 160) + "…" : s;
  };

  return (
    <div className="stack">
      <PageTitle pixelIcon="shield" sub="تصدير البيانات والنسخ الاحتياطي والاستعادة وسجل العمليات.">
        الإدارة
      </PageTitle>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card !p-3">
          <div className="tnum text-2xl font-extrabold text-accent-text">{players.length}</div>
          <div className="text-xs text-muted">لاعب</div>
        </div>
        <div className="card !p-3">
          <div className="tnum text-2xl font-extrabold text-good">{matches.length}</div>
          <div className="text-xs text-muted">مباراة</div>
        </div>
        <div className="card !p-3">
          <div className="tnum text-2xl font-extrabold">{seasons.length}</div>
          <div className="text-xs text-muted">موسم</div>
        </div>
      </div>

      <section className="card stack">
        <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
          <PixelIcon name="coin" size={18} />
          <span>التصدير والنسخ الاحتياطي</span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <a className="btn btn-primary" href="/api/export?format=json" download>
            💾 نسخة احتياطية كاملة (JSON)
          </a>
          <a className="btn" href="/api/export?format=csv&kind=matches" download>
            📄 المباريات (CSV)
          </a>
          <a className="btn" href="/api/export?format=csv&kind=players" download>
            📄 الترتيب (CSV)
          </a>
        </div>
      </section>

      <section className="card stack">
        <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
          <PixelIcon name="comeback" size={18} />
          <span>استعادة نسخة احتياطية</span>
        </h2>
        <p className="text-sm text-muted">
          يتم فحص الملف أولاً، ولا يتغير أي شيء قبل تأكيدك. الاستعادة تستبدل البيانات الحالية وتحافظ على العلاقات بين
          اللاعبين والمباريات والمواسم.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          className="input !py-2"
          onChange={pick}
          disabled={busy}
          aria-label="ملف النسخة الاحتياطية"
        />
        {summary && (
          <div className="border-2 border-accent bg-accent/10 p-3 text-sm">
            ✅ الملف «{file?.name}» صالح ويحتوي على {summary.players} لاعب و{summary.seasons} موسم و{summary.matches} مباراة.
            <div className="mt-2">
              <button className="btn btn-danger" onClick={restore} disabled={busy}>
                استبدال البيانات الحالية بهذه النسخة
              </button>
            </div>
          </div>
        )}
        {msg && (
          <p role="alert" className={`text-sm font-bold ${msg.ok ? "text-good" : "text-bad"}`}>
            {msg.text}
          </p>
        )}
      </section>

      <section>
        <SectionTitle
          pixelIcon="key"
          extra={
            <button className="btn btn-sm" onClick={loadAudit}>
              تحديث
            </button>
          }
        >
          سجل العمليات
        </SectionTitle>
        {auditErr ? (
          <p role="alert" className="card text-sm font-bold text-bad">
            {auditErr}
          </p>
        ) : !entries ? (
          <Skeleton className="h-24 w-full" />
        ) : entries.length === 0 ? (
          <div className="card">
            <Empty title="لا توجد عمليات مسجلة بعد" />
          </div>
        ) : (
          <div className="stack !gap-1.5">
            {entries.map((e) => (
              <details key={e.id} className="card !p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <b>{AUDIT_LABELS[e.action] ?? "عملية"}</b>
                  <span className="text-xs text-muted">
                    {fmtDate(e.at)} · {e.admin}
                  </span>
                </summary>
                <div className="mt-2 grid gap-1 text-xs" dir="ltr">
                  <div>
                    <span className="text-muted">قبل: </span>
                    {brief(e.previous)}
                  </div>
                  <div>
                    <span className="text-muted">بعد: </span>
                    {brief(e.next)}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
