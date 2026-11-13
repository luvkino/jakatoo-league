// ============================================================================
// SECRET BOSS FIGHT — "THE LAST PLACE" (المركز الأخير).
// A completely fictional arcade encounter. It reads no league data and writes
// no league data: HP numbers, damage and dialogue are all local state.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { EggModal } from "./EggModal";
import { BossSprite } from "./eggArt";
import { PixelIcon, PixelMeter } from "@/components/PixelArt";
import { BOSS_LOSE_TEXT, BOSS_MOVES, BOSS_TAUNTS, BOSS_WIN_TEXT } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";

const MAX_HP = 100;
const BOSS_HP = 110;

interface LogLine {
  id: number;
  text: string;
  tone: "good" | "bad" | "info";
}

export function SecretBoss({
  onClose,
  sfx,
  onBoom,
}: {
  onClose: () => void;
  sfx: (k: EggSfxKind) => void;
  onBoom: (count?: number, palette?: "rainbow" | "gold" | "pink") => void;
}) {
  const [playerHp, setPlayerHp] = useState(MAX_HP);
  const [bossHp, setBossHp] = useState(BOSS_HP);
  const [locked, setLocked] = useState(false);
  const [charge, setCharge] = useState(0);
  const [defending, setDefending] = useState(false);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [taunt, setTaunt] = useState("…زائر؟ في مملكتي؟");
  const [bossHurt, setBossHurt] = useState(false);
  const [playerHurt, setPlayerHurt] = useState(false);
  const [log, setLog] = useState<LogLine[]>([
    { id: 0, text: "ظهر المركز الأخير! تحدَّه إن كنت تجرؤ.", tone: "info" },
  ]);

  const playerHpRef = useRef(playerHp);
  const bossHpRef = useRef(bossHp);
  const chargeRef = useRef(charge);
  const defendingRef = useRef(defending);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const logIdRef = useRef(0);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  const pushLog = useCallback((text: string, tone: LogLine["tone"]) => {
    logIdRef.current += 1;
    const line = { id: logIdRef.current, text, tone };
    setLog((l) => [...l.slice(-4), line]);
  }, []);

  const finish = useCallback(
    (won: boolean) => {
      setResult(won ? "win" : "lose");
      if (won) {
        sfx("bossWin");
        onBoom(60, "gold");
      } else {
        sfx("bossLose");
      }
    },
    [onBoom, sfx],
  );

  const bossTurn = useCallback(() => {
    const move = BOSS_MOVES[Math.floor(Math.random() * BOSS_MOVES.length)]!;
    let dmg = move.min + Math.floor(Math.random() * (move.max - move.min + 1));
    if (defendingRef.current) {
      dmg = Math.ceil(dmg / 2);
      defendingRef.current = false;
      setDefending(false);
    }
    setTaunt(BOSS_TAUNTS[Math.floor(Math.random() * BOSS_TAUNTS.length)]!);
    sfx("bossAttack");
    setPlayerHurt(true);
    later(() => setPlayerHurt(false), 380);
    const hp = Math.max(0, playerHpRef.current - dmg);
    playerHpRef.current = hp;
    setPlayerHp(hp);
    pushLog(`المركز الأخير يستخدم «${move.name}» — ${dmg} ضرر!`, "bad");
    later(() => {
      if (hp <= 0) {
        finish(false);
      } else {
        chargeRef.current = Math.max(0, chargeRef.current - 1);
        setCharge(chargeRef.current);
        setLocked(false);
      }
    }, 950);
  }, [finish, later, pushLog, sfx]);

  const afterPlayerHit = useCallback(
    (bossHpAfter: number) => {
      if (bossHpAfter <= 0) {
        later(() => finish(true), 700);
      } else {
        later(bossTurn, 850);
      }
    },
    [bossTurn, finish, later],
  );

  const attack = useCallback(() => {
    if (locked || result) return;
    setLocked(true);
    const missed = Math.random() < 0.15;
    if (missed) {
      pushLog("أخطأت الضربة! المركز الأخير يسخر منك.", "info");
      later(bossTurn, 750);
      return;
    }
    const dmg = 8 + Math.floor(Math.random() * 7);
    sfx("bossHit");
    setBossHurt(true);
    later(() => setBossHurt(false), 380);
    const hp = Math.max(0, bossHpRef.current - dmg);
    bossHpRef.current = hp;
    setBossHp(hp);
    pushLog(`ضربت المركز الأخير — ${dmg} ضرر!`, "good");
    afterPlayerHit(hp);
  }, [afterPlayerHit, bossTurn, later, locked, pushLog, result, sfx]);

  const specialAttack = useCallback(() => {
    if (locked || result || chargeRef.current > 0) return;
    setLocked(true);
    const dmg = 18 + Math.floor(Math.random() * 9);
    chargeRef.current = 3;
    setCharge(3);
    sfx("bossHit");
    sfx("explosion");
    setBossHurt(true);
    later(() => setBossHurt(false), 420);
    const hp = Math.max(0, bossHpRef.current - dmg);
    bossHpRef.current = hp;
    setBossHp(hp);
    pushLog(`💥 ضربة الحصالة! ${dmg} ضرر — القاع يرتجف!`, "good");
    afterPlayerHit(hp);
  }, [afterPlayerHit, later, locked, pushLog, result, sfx]);

  const defend = useCallback(() => {
    if (locked || result) return;
    setLocked(true);
    defendingRef.current = true;
    setDefending(true);
    const heal = 4 + Math.floor(Math.random() * 5);
    const hp = Math.min(MAX_HP, playerHpRef.current + heal);
    playerHpRef.current = hp;
    setPlayerHp(hp);
    sfx("chip");
    pushLog(`🛡️ تحصّنت واستعدت ${heal} نقاط حياة.`, "good");
    later(bossTurn, 750);
  }, [bossTurn, later, locked, pushLog, result, sfx]);

  const replay = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    playerHpRef.current = MAX_HP;
    bossHpRef.current = BOSS_HP;
    chargeRef.current = 0;
    defendingRef.current = false;
    setPlayerHp(MAX_HP);
    setBossHp(BOSS_HP);
    setCharge(0);
    setDefending(false);
    setResult(null);
    setLocked(false);
    setTaunt("عدت؟! القاع يتذكّر الجميع.");
    logIdRef.current += 1;
    setLog([{ id: logIdRef.current, text: "جولة جديدة ضد المركز الأخير!", tone: "info" }]);
    sfx("bossAttack");
  }, [sfx]);

  return (
    <EggModal
      title={
        <>
          <span className="font-pixel-en text-base">BOSS://LAST-PLACE</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <div className="stack">
        {/* Battle scene */}
        <div className="egg-battle-scene relative overflow-hidden border-2 border-[#3b0764] p-3 sm:p-4">
          {/* Boss HP */}
          <div className="mx-auto max-w-md">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-pixel-en text-[10px] font-extrabold text-[#f43f5e] sm:text-xs" dir="ltr">
                THE LAST PLACE
              </span>
              <span className="tnum text-xs font-extrabold text-[#fda4af]" dir="ltr">
                {bossHp}/{BOSS_HP}
              </span>
            </div>
            <PixelMeter value={bossHp} max={BOSS_HP} segments={12} tone="bad" />
          </div>

          {/* Boss sprite + dialogue */}
          <div className="relative mt-3 flex flex-col items-center">
            <div
              className={`mb-2 max-w-[17rem] border-2 border-[#581c87] bg-[#1e1b4b]/90 px-2.5 py-1.5 text-center text-xs font-bold text-[#e9d5ff] ${
                result ? "opacity-0" : "pop"
              }`}
            >
              {taunt}
            </div>
            <BossSprite size={110} hurt={bossHurt} />
          </div>

          {/* Player HP */}
          <div className="mx-auto mt-3 max-w-md">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-extrabold">
                <PixelIcon name="players" size={14} />
                أنت (بطل مؤقت)
              </span>
              <span className={`tnum text-xs font-extrabold ${playerHurt ? "text-bad" : ""}`} dir="ltr">
                {playerHp}/{MAX_HP}
              </span>
            </div>
            <PixelMeter value={playerHp} max={MAX_HP} segments={10} tone="good" />
            {defending && <p className="mt-1 text-center text-[11px] font-bold text-good">🛡️ دفاع مفعّل</p>}
          </div>
        </div>

        {/* Battle log */}
        <div className="min-h-[4.6rem] border-2 border-line bg-bg p-2" aria-live="polite">
          {log.map((l) => (
            <p
              key={l.id}
              className={`text-xs font-bold leading-relaxed ${
                l.tone === "good" ? "text-good" : l.tone === "bad" ? "text-bad" : "text-muted"
              }`}
            >
              › {l.text}
            </p>
          ))}
        </div>

        {/* Actions / result */}
        {result ? (
          <div className="stack items-center gap-2 border-2 p-3 text-center pop"
            style={{
              borderColor: result === "win" ? "var(--good)" : "var(--bad)",
              background: result === "win" ? "color-mix(in srgb, var(--good) 10%, var(--card))" : "color-mix(in srgb, var(--bad) 10%, var(--card))",
            }}
          >
            <div className="font-pixel-ar text-3xl font-extrabold">
              {result === "win" ? "🏆 النصر!" : "💀 الهزيمة"}
            </div>
            <p className="text-sm font-bold">
              {result === "win" ? BOSS_WIN_TEXT : BOSS_LOSE_TEXT}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" onClick={replay}>
                🔄 إعادة المحاولة
              </button>
              <button className="btn" onClick={onClose}>
                🚪 مغادرة الساحة
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-primary !px-1 text-sm" onClick={attack} disabled={locked}>
              ⚔️ هجوم
            </button>
            <button
              className="btn !px-1 text-sm"
              onClick={specialAttack}
              disabled={locked || charge > 0}
              title={charge > 0 ? `يُشحن… ${charge} أدوار` : "ضربة أسطورية"}
            >
              💥 الحصالة {charge > 0 ? `(${charge})` : ""}
            </button>
            <button className="btn !px-1 text-sm" onClick={defend} disabled={locked}>
              🛡️ دفاع
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-muted">
          🎮 معركة خيالية بالكامل — لا تتصل بأي ترتيب حقيقي ولا تعدّل أي بيانات في الدوري.
        </p>
      </div>
    </EggModal>
  );
}
