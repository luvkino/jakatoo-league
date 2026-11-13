"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon } from "@/components/PixelArt";
import { LoginButton } from "@/components/Shell";
import { Modal, PlayerLink, fmtDate } from "@/components/ui";
import type { MatchRec } from "@/lib/stats";

const stonesText = (n: number) =>
  n === 0 ? "لم يبقَ أي حجر" : n === 1 ? "بقي حجر واحد" : n === 2 ? "بقي حجران" : `بقي ${n} أحجار`;

function TeamBox({ ids, won }: { ids: [string, string]; won: boolean }) {
  return (
    <div
      className={`min-w-0 flex-1 border-2 px-2.5 py-2 ${
        won ? "border-good/60 bg-good/10" : "border-line bg-card2"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-muted">
        {won ? (
          <>
            <PixelIcon name="trophy" size={14} />
            <span className="text-good">الفريق الفائز</span>
          </>
        ) : (
          <span>الفريق الخاسر</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <PlayerLink id={ids[0]} className="truncate" />
        <PlayerLink id={ids[1]} className="truncate" />
      </div>
    </div>
  );
}

export function MatchForm({ initial, onDone }: { initial?: MatchRec; onDone?: () => void }) {
  const { admin, activePlayers, players, addMatch, updateMatch, toast, activeSeason, loaded } = useLeague();
  const [sel, setSel] = useState<string[]>(initial ? [...initial.t1, ...initial.t2] : ["", "", "", ""]);
  const [winner, setWinner] = useState<0 | 1 | 2>(initial?.winningTeam ?? 0);
  const [stones, setStones] = useState<number | null>(initial ? initial.stones : null);
  const [comeback, setComeback] = useState(initial?.comeback ?? false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const options = useMemo(() => {
    const keep = new Set(initial ? [...initial.t1, ...initial.t2] : []);
    return players.filter((p) => !p.archived || keep.has(p.id));
  }, [players, initial]);

  if (admin === "unknown") return <div className="skel h-40 w-full" />;
  if (admin === "viewer")
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">تسجيل المباريات متاح للمشرف فقط.</span>
        <LoginButton />
      </div>
    );
  if (loaded && activePlayers.length < 4 && !initial)
    return (
      <div className="py-4 text-center text-sm">
        تحتاج إلى 4 لاعبين على الأقل لتسجيل مباراة (لديك الآن {activePlayers.length}).{" "}
        <Link href="/players" className="font-bold text-accent-text underline">
          أضف لاعبين
        </Link>
      </div>
    );

  const labels = [
    "الفريق الأول — اللاعب الأول",
    "الفريق الأول — اللاعب الثاني",
    "الفريق الثاني — اللاعب الأول",
    "الفريق الثاني — اللاعب الثاني",
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (sel.some((s) => !s)) return setErr("اختر اللاعبين الأربعة (لاعبان في كل فريق).");
    if (new Set(sel).size !== 4) return setErr("يجب أن يكون اللاعبون الأربعة مختلفين.");
    if (winner === 0) return setErr("اختر الفريق الفائز (لا يوجد تعادل).");
    if (stones === null || !Number.isInteger(stones) || stones < 0 || stones > 8)
      return setErr("حدد عدد الأحجار المتبقية مع الفريق الخاسر (من 0 إلى 8).");
    setErr("");
    setBusy(true);
    const payload = {
      t1: [sel[0], sel[1]] as [string, string],
      t2: [sel[2], sel[3]] as [string, string],
      winningTeam: winner,
      stones,
      comeback,
      note: note.trim() || undefined,
    };
    const r = initial ? await updateMatch(initial.id, payload) : await addMatch(payload);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    toast(initial ? "✅ تم تعديل المباراة وإعادة حساب الإحصائيات." : "✅ تم تسجيل المباراة.", "ok");
    if (!initial) {
      setSel(["", "", "", ""]);
      setWinner(0);
      setStones(null);
      setComeback(false);
      setNote("");
    }
    onDone?.();
  }

  const setP = (i: number, v: string) => setSel((s) => s.map((x, j) => (j === i ? v : x)));

  return (
    <form onSubmit={submit} className="stack" aria-label="تسجيل مباراة" noValidate>
      {!initial && activeSeason && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <PixelIcon name="calendar" size={14} />
          <span>الموسم: {activeSeason.name} · يُسجَّل التاريخ والوقت تلقائياً</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((team) => (
          <fieldset
            key={team}
            className={`stack border-2 p-3 ${
              winner === team + 1 ? "border-accent bg-accent/5" : "border-line bg-card2/40"
            }`}
          >
            <legend className="px-1.5 text-sm font-extrabold">
              {team === 0 ? "الفريق الأول" : "الفريق الثاني"}
            </legend>
            {[0, 1].map((k) => {
              const i = team * 2 + k;
              return (
                <div key={i}>
                  <label className="label" htmlFor={`pl-${i}`}>
                    {labels[i]}
                  </label>
                  <select id={`pl-${i}`} className="input" value={sel[i]} onChange={(e) => setP(i, e.target.value)}>
                    <option value="">اختر لاعباً…</option>
                    {options.map((p) => (
                      <option key={p.id} value={p.id} disabled={sel.includes(p.id) && sel[i] !== p.id}>
                        {p.name}
                        {p.archived ? " (مؤرشف)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>

      <div>
        <div className="label">الفريق الفائز</div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={winner === t}
              onClick={() => setWinner(t as 1 | 2)}
              className={`btn ${winner === t ? "btn-primary" : ""}`}
            >
              <PixelIcon name="trophy" size={16} />
              <span>{t === 1 ? "الفريق الأول" : "الفريق الثاني"}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label">الأحجار المتبقية مع الفريق الخاسر</div>
        <div className="grid grid-cols-9 gap-1.5" role="radiogroup" aria-label="الأحجار المتبقية">
          {Array.from({ length: 9 }, (_, n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={stones === n}
              onClick={() => setStones(n)}
              className={`btn tnum !px-0 ${stones === n ? "btn-primary" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex min-h-[46px] cursor-pointer items-center gap-3 border-2 border-line bg-card2 px-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--accent)]"
          checked={comeback}
          onChange={(e) => setComeback(e.target.checked)}
        />
        <PixelIcon name="comeback" size={18} />
        <span className="font-bold">فوز بعد عودة (Comeback)</span>
      </label>

      <div>
        <label className="label" htmlFor="m-note">
          ملاحظة (اختياري)
        </label>
        <input id="m-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </div>

      {err && (
        <p role="alert" className="text-sm font-bold text-bad">
          ⚠️ {err}
        </p>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "جارٍ الحفظ…" : initial ? "حفظ التعديلات" : "تسجيل المباراة"}
      </button>
    </form>
  );
}

export function MatchRow({ m, editable = false }: { m: MatchRec; editable?: boolean }) {
  const { admin, deleteMatch, toast, seasons } = useLeague();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const win = m.winningTeam;
  const season = seasons.find((s) => s.id === m.seasonId);

  async function del() {
    if (busy) return;
    if (!window.confirm("هل تريد حذف هذه المباراة؟ ستُعاد حسابات الإحصائيات والإنجازات.")) return;
    setBusy(true);
    const r = await deleteMatch(m.id);
    setBusy(false);
    toast(r.ok ? "🗑️ تم حذف المباراة وإعادة حساب الإحصائيات." : r.message, r.ok ? "ok" : "err");
  }

  return (
    <div className="card !p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span>{fmtDate(m.playedAt)}</span>
        {season && <span className="chip">{season.name}</span>}
        <span className="chip">
          <PixelIcon name="stone" size={12} />
          <span>{stonesText(m.stones)}</span>
        </span>
        {m.stones >= 5 && (
          <span className="chip chip-good">
            <PixelIcon name="fire" size={12} />
            <span>ساحق</span>
          </span>
        )}
        {m.stones === 0 && (
          <span className="chip chip-good">
            <PixelIcon name="star" size={12} />
            <span>نظيف</span>
          </span>
        )}
        {m.comeback && (
          <span className="chip chip-accent">
            <PixelIcon name="comeback" size={12} />
            <span>عودة</span>
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <TeamBox ids={m.t1} won={win === 1} />
        <div className="grid place-items-center px-1 font-pixel-en text-[11px] font-bold text-accent-text">VS</div>
        <TeamBox ids={m.t2} won={win === 2} />
      </div>

      {/* Visual pixel stones indicator (0..8) */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>الأحجار المتبقية:</span>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: 8 }, (_, idx) => (
            <span
              key={idx}
              className={`h-2.5 w-2.5 border ${
                idx < m.stones ? "border-sky-300 bg-sky-400" : "border-line bg-bg opacity-45"
              }`}
            />
          ))}
        </div>
      </div>

      {m.note && <p className="mt-2 border-t border-line/60 pt-1.5 text-sm text-muted">📝 {m.note}</p>}

      {editable && admin === "admin" && (
        <div className="mt-2.5 flex gap-2">
          <button className="btn btn-sm" onClick={() => setEdit(true)}>
            ✏️ تعديل
          </button>
          <button className="btn btn-sm btn-danger" onClick={del} disabled={busy}>
            🗑️ حذف
          </button>
        </div>
      )}
      {edit && (
        <Modal title="تعديل المباراة" onClose={() => setEdit(false)}>
          <MatchForm initial={m} onDone={() => setEdit(false)} />
        </Modal>
      )}
    </div>
  );
}
