"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { LoginButton } from "@/components/Shell";

/**
 * Add a player: type a name, press the button or Enter. Nothing else is required.
 * - The form is shown to the admin as soon as the session is known; while the
 *   session is loading a skeleton is shown (it never stays hidden).
 * - Success is only shown after the server confirmed the write.
 * - On failure the typed name is preserved and a precise Arabic error is shown.
 */
export default function PlayerAdd({ compact = false }: { compact?: boolean }) {
  const { admin, addPlayer, players, toast } = useLeague();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (lock.current) return; // prevent duplicate submissions while saving
    lock.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const r = await addPlayer(name);
      if (r.ok) {
        setName("");
        setMsg({ kind: "ok", text: `تمت إضافة «${r.player.name}» وإنشاء ملفه الشخصي تلقائياً.` });
        toast(`✅ تمت إضافة اللاعب «${r.player.name}»`, "ok");
        input.current?.focus();
      } else {
        setMsg({ kind: "err", text: r.message }); // typed name is preserved
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (admin === "unknown") {
    return (
      <div className="card stack">
        <div className="skel h-5 w-32" />
        <div className="skel h-11 w-full" />
      </div>
    );
  }
  if (admin === "viewer") {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">إضافة لاعب</div>
          <div className="text-sm text-muted">إضافة اللاعبين متاحة للمشرف فقط. سجّل الدخول للمتابعة.</div>
        </div>
        <LoginButton />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" aria-label="إضافة لاعب">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={compact ? "new-player-quick" : "new-player"} className="font-extrabold">
          ➕ إضافة لاعب
        </label>
        <span className="chip tnum" data-testid="player-count">
          {players.filter((p) => !p.archived).length} لاعب
        </span>
      </div>
      <div className="flex gap-2">
        <input
          ref={input}
          id={compact ? "new-player-quick" : "new-player"}
          name="playerName"
          className="input"
          placeholder="اكتب اسم اللاعب"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (msg) setMsg(null);
          }}
          autoComplete="off"
          maxLength={60}
          enterKeyHint="done"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "إضافة لاعب"}
        </button>
      </div>
      {msg && (
        <p role={msg.kind === "err" ? "alert" : "status"} className={`mt-2 text-sm font-bold ${msg.kind === "err" ? "text-bad" : "text-good"}`}>
          {msg.kind === "err" ? "⚠️ " : "✅ "}
          {msg.text}
        </p>
      )}
    </form>
  );
}
