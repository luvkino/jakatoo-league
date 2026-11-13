"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon } from "@/components/PixelArt";
import { Empty, PageTitle, SectionTitle, Skeleton, fmtDay } from "@/components/ui";
import { computeLeague, type SeasonRec } from "@/lib/stats";

const STATUS: Record<SeasonRec["status"], string> = { active: "نشط", closed: "مغلق", archived: "مؤرشف" };

export default function SeasonsPage() {
  const { seasons, matches, players, admin, createSeason, updateSeason, setScope, nameOf, toast, loaded } = useLeague();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const info = useMemo(
    () =>
      [...seasons].reverse().map((s) => {
        const ms = matches.filter((m) => m.seasonId === s.id);
        const top = computeLeague(players, ms).ranking.filter((r) => r.games > 0)[0];
        return { s, count: ms.length, top };
      }),
    [seasons, matches, players],
  );

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setErr("اكتب اسم الموسم.");
    if (
      !window.confirm(
        "سيتم إغلاق الموسم الحالي وبدء موسم جديد بإحصائيات صفرية. تبقى جميع المواسم والمباريات السابقة محفوظة. المتابعة؟",
      )
    )
      return;
    setBusy(true);
    setErr("");
    const r = await createSeason(name, start || undefined);
    setBusy(false);
    if (r.ok) {
      setName("");
      setStart("");
      toast("✅ بدأ موسم جديد. المواسم السابقة محفوظة في الأرشيف.", "ok");
    } else setErr(r.message);
  }
  async function act(id: string, patch: { name?: string; status?: string }, okMsg: string) {
    const r = await updateSeason(id, patch);
    toast(r.ok ? okMsg : r.message, r.ok ? "ok" : "err");
  }

  return (
    <div className="stack">
      <PageTitle
        pixelIcon="calendar"
        sub="بدء موسم جديد يصفّر إحصائيات الموسم فقط، بينما تبقى هوية اللاعبين وسجل المباريات والمواسم السابقة كما هي."
      >
        المواسم
      </PageTitle>

      {admin === "admin" && (
        <form onSubmit={create} className="card stack">
          <h2 className="flex items-center gap-2 font-pixel-ar text-2xl font-extrabold">
            <PixelIcon name="sparkle" size={20} />
            <span>بدء موسم جديد</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-name">
                اسم الموسم
              </label>
              <input
                id="s-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: موسم الشتاء"
              />
            </div>
            <div>
              <label className="label" htmlFor="s-start">
                تاريخ البداية (اختياري)
              </label>
              <input
                id="s-start"
                type="date"
                className="input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
          </div>
          {err && (
            <p role="alert" className="text-sm font-bold text-bad">
              {err}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "إغلاق الموسم الحالي وبدء موسم جديد"}
          </button>
        </form>
      )}

      <section>
        <SectionTitle pixelIcon="calendar">كل المواسم</SectionTitle>
        {!loaded ? (
          <Skeleton className="h-24 w-full" />
        ) : info.length === 0 ? (
          <div className="card">
            <Empty title="لا توجد مواسم" />
          </div>
        ) : (
          <div className="stack !gap-2">
            {info.map(({ s, count, top }) => (
              <div
                key={s.id}
                className={`card ${s.status === "active" ? "border-good/70" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PixelIcon name={s.status === "active" ? "sparkle" : "calendar"} size={20} />
                  <h3 className="min-w-0 flex-1 truncate text-lg font-extrabold">{s.name}</h3>
                  <span className={`chip ${s.status === "active" ? "chip-good" : ""}`}>{STATUS[s.status]}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <span>
                    من {fmtDay(s.startDate)}
                    {s.endDate ? ` إلى ${fmtDay(s.endDate)}` : ""}
                  </span>
                  <span>· {count} مباراة</span>
                  {top && (
                    <span className="inline-flex items-center gap-1">
                      · {s.status === "active" ? "المتصدر" : "البطل"}:{" "}
                      <PixelIcon name="crown" size={14} />
                      <b className="text-fg">{nameOf(top.id)}</b> ({top.points} نقطة)
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/leaderboard" onClick={() => setScope(s.id)} className="btn btn-sm">
                    عرض الترتيب
                  </Link>
                  {admin === "admin" && (
                    <>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          const n = window.prompt("اسم الموسم الجديد", s.name);
                          if (n && n.trim()) act(s.id, { name: n }, "✅ تم تعديل اسم الموسم.");
                        }}
                      >
                        ✏️ إعادة تسمية
                      </button>
                      {s.status === "active" && (
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            window.confirm("إغلاق الموسم؟ لن يمكن تسجيل مباريات حتى تبدأ موسماً جديداً.") &&
                            act(s.id, { status: "closed" }, "🔒 تم إغلاق الموسم.")
                          }
                        >
                          🔒 إغلاق
                        </button>
                      )}
                      {s.status === "closed" && (
                        <button
                          className="btn btn-sm"
                          onClick={() => act(s.id, { status: "archived" }, "📦 تمت أرشفة الموسم.")}
                        >
                          📦 أرشفة
                        </button>
                      )}
                      {s.status !== "active" && (
                        <button
                          className="btn btn-sm"
                          onClick={() => act(s.id, { status: "active" }, "✅ تمت إعادة تفعيل الموسم.")}
                        >
                          ↩️ إعادة تفعيل
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
