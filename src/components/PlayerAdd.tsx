"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon } from "@/components/PixelArt";
import { LoginButton } from "@/components/Shell";

/**
 * Add a player: type a name, press the button or Enter. Nothing else is required.
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
    if (lock.current) return;
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
        setMsg({ kind: "err", text: r.message });
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
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border-2 border-line bg-card2">
            <PixelIcon name="players" size={22} />
          </div>
          <div>
            <div className="font-extrabold">إضافة لاعب</div>
            <div className="text-sm text-muted">إضافة اللاعبين متاحة للمشرف فقط. سجّل الدخول للمتابعة.</div>
          </div>
        </div>
        <LoginButton />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" aria-label="إضافة لاعب">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={compact ? "new-player-quick" : "new-player"} className="flex items-center gap-2 font-extrabold">
          <PixelIcon name="players" size={18} />
          <span>إضافة لاعب جديد</span>
        </label>
        <span className="chip chip-accent tnum" data-testid="player-count">
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
        <p
          role={msg.kind === "err" ? "alert" : "status"}
          className={`mt-2 text-sm font-bold ${msg.kind === "err" ? "text-bad" : "text-good"}`}
        >
          {msg.kind === "err" ? "⚠️ " : "✅ "}
          {msg.text}
        </p>
      )}
    </form>
  );
}
