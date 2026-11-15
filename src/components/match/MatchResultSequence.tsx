"use client";

/**
 * MATCH COMPLETE — animated results + live ranking movement.
 *
 * The component is purely presentational: it receives the official ranking
 * before and after a match that the server has already saved, and animates the
 * difference. It never touches points, stats or rankings.
 *
 * Sequence: MATCH COMPLETE banner → match summary → previous positions →
 * rows animate to their new official positions → climbers highlighted →
 * first place celebrated → fallers highlighted → a funny Arabic line for the
 * last place → final leaderboard.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { useAppearance } from "@/components/Settings";
import { Modal } from "@/components/ui";
import { AvatarSprite } from "@/components/avatar/AvatarSprite";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";
import {
  computeRankMovements,
  pickClimbMessage,
  pickFallMessage,
  pickFirstPlaceMessage,
  pickLastPlaceMessage,
  formatDelta,
  type RankRow,
} from "@/lib/matchMessages";
import type { MatchRec } from "@/lib/stats";

export interface PendingResult {
  match: MatchRec;
  before: RankRow[];
  after: RankRow[];
}

const STEP_MS = 900;

export function MatchResultSequence({
  payload,
  nameOf,
  onClose,
}: {
  payload: PendingResult;
  nameOf: (id: string) => string;
  onClose: () => void;
}) {
  const { prefs, reducedMotion, avatarFor } = usePlayerPrefs();
  const { sfx } = useChaos();
  const { a } = useAppearance();
  const [step, setStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const animOn = prefs.matchAnimations && !reducedMotion && a.animIntensity !== "off";
  const summary = useMemo(() => computeRankMovements(payload.before, payload.after), [payload]);
  const seed = useMemo(() => payload.match.id.charCodeAt(0) + payload.match.stones * 7, [payload.match]);

  const totalSteps = animOn ? 6 : 1;

  useEffect(() => {
    if (!animOn) return;
    const push = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    for (let i = 1; i <= 6; i++) push(() => setStep(i), i * STEP_MS);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [animOn, payload.match.id]);

  // Retro sound cues per stage (respects the audio settings).
  useEffect(() => {
    if (!animOn) return;
    if (step === 1) sfx("notification");
    if (step === 2) sfx("click");
    if (step === 3) sfx(summary.maxClimb > 0 ? "achievement" : "notification");
    if (step === 4 && summary.leaderChanged) sfx("leaderChange");
    if (step === 5) sfx(summary.maxFall > 0 ? "lastPlace" : "drawTick");
    if (step === 6) sfx("victory");
  }, [step, animOn, summary.maxClimb, summary.maxFall, summary.leaderChanged, sfx]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep(totalSteps);
    sfx("click");
  };

  const rows = animOn && step < 3 ? payload.before : payload.after;
  const showMovements = !animOn || step >= 3;
  const showClimb = !animOn || step >= 3;
  const showLeader = !animOn || step >= 4;
  const showFall = !animOn || step >= 5;
  const showLastJoke = !animOn || step >= 6;

  const winningIds = payload.match.winningTeam === 1 ? payload.match.t1 : payload.match.t2;
  const lastPlayerId = summary.lastPlaceId;
  const lastPlayerName = lastPlayerId ? nameOf(lastPlayerId) : null;

  return (
    <Modal title="MATCH COMPLETE" onClose={onClose}>
      <div className="stack !gap-3" data-testid="match-result-sequence">
        {/* 1 — arcade banner */}
        <div className="mr-banner relative overflow-hidden border-2 border-accent bg-card2 px-3 py-3 text-center">
          <div className="font-pixel-en text-[11px] tracking-widest text-accent-text">MATCH COMPLETE</div>
          <div className="mt-1 font-pixel-ar text-2xl font-extrabold">انتهت المباراة!</div>
          {!summary.leaderChanged && summary.maxClimb === 0 && (
            <div className="text-[11px] text-muted">تم تثبيت النتيجة الرسمية للدوري.</div>
          )}
        </div>

        {/* 2 — the match result itself */}
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          {[1, 2].map((team) => {
            const ids = team === 1 ? payload.match.t1 : payload.match.t2;
            const won = payload.match.winningTeam === team;
            return (
              <div
                key={team}
                className={`border-2 px-2 py-2 ${won ? "border-good bg-good/10" : "border-line bg-card2"}`}
              >
                <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-extrabold text-muted">
                  {won ? <PixelIcon name="trophy" size={13} /> : null}
                  <span>{won ? "الفائز" : "الخاسر"}</span>
                </div>
                {ids.map((id) => (
                  <div key={id} className="truncate text-xs font-bold">
                    {nameOf(id)}
                  </div>
                ))}
                {won && <div className="mt-1 text-[10px] text-muted">متبقي {payload.match.stones} أحجار</div>}
              </div>
            );
          })}
        </div>

        {/* 3/4 — "previous positions" label */}
        <div className="flex items-center justify-between text-[11px] font-bold text-muted">
          <span>
            {step < 3 && animOn ? "الترتيب السابق" : "الترتيب الرسمي الجديد"}
          </span>
          {animOn && step < 3 && <span className="chip !text-[10px]">قبل</span>}
          {animOn && step >= 3 && <span className="chip chip-accent !text-[10px]">بعد</span>}
        </div>

        {/* 5 — animated leaderboard */}
        <ul className="stack !gap-1">
          {rows.map((r, idx) => {
            const move = summary.rows.find((m) => m.playerId === r.playerId);
            const up = !!move && move.direction === "up" && showClimb;
            const down = !!move && move.direction === "down" && showFall;
            const isFirst = r.rank === 1 && showLeader;
            return (
              <li
                key={r.playerId}
                className={`mr-row flex items-center gap-2 border-2 px-2 py-1.5 ${
                  isFirst
                    ? "mr-crown leader-card-panel"
                    : up
                      ? "mr-up border-good/70"
                      : down
                        ? "mr-down border-bad/70"
                        : "border-line bg-card2"
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span className="w-6 text-center font-pixel-en text-[11px] font-bold text-muted">{r.rank}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center border border-line bg-bg">
                  <AvatarSprite config={avatarFor(r.playerId) ?? fallbackAvatar(r.playerId)} size={24} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{nameOf(r.playerId)}</span>
                {isFirst && (
                  <span className="chip chip-legendary !text-[10px]">
                    <PixelIcon name="crown" size={11} /> الصدارة
                  </span>
                )}
                {showMovements && move && move.direction !== "same" && move.direction !== "new" && (
                  <span
                    className={`chip !text-[10px] ${up ? "chip-good" : "chip-bad"}`}
                    title={up ? "صعد" : "تراجع"}
                  >
                    {formatDelta(move.delta)}
                  </span>
                )}
                {showMovements && move?.direction === "new" && <span className="chip chip-accent !text-[10px]">جديد</span>}
              </li>
            );
          })}
        </ul>

        {/* 6 — Arabic commentary per movement */}
        {showMovements && (
          <div className="stack !gap-1.5">
            {showLeader && summary.leader && !reducedMotion && (
              <p className="border-2 border-yellow-500/70 bg-yellow-400/10 px-2 py-1.5 text-xs font-bold text-yellow-200">
                👑 {nameOf(summary.leader.playerId)} — {pickFirstPlaceMessage(seed)}
              </p>
            )}
            {showClimb && summary.maxClimb >= 1 && summary.climbers[0] && (
              <p className="border-2 border-good/60 bg-good/10 px-2 py-1.5 text-xs font-bold text-good">
                ▲ {nameOf(summary.climbers[0].playerId)} — {pickClimbMessage(seed + summary.maxClimb)}
              </p>
            )}
            {showFall && summary.maxFall >= 1 && summary.fallers[0] && (
              <p className="border-2 border-bad/60 bg-bad/10 px-2 py-1.5 text-xs font-bold text-bad">
                ▼ {nameOf(summary.fallers[0].playerId)} — {pickFallMessage(seed + summary.maxFall)}
              </p>
            )}
            {showLastJoke && lastPlayerName && (
              <p className="border-2 border-pink-400/60 bg-pink-500/10 px-2 py-1.5 text-xs font-bold text-pink-200">
                🐷 المركز الأخير: {lastPlayerName} — {pickLastPlaceMessage(seed + 3)}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted">
            {animOn && step < totalSteps ? `مشهد ${step + 1} من ${totalSteps}` : "الترتيب الرسمي النهائي"}
          </span>
          <div className="flex gap-2">
            {animOn && step < totalSteps && (
              <button type="button" className="btn btn-sm" onClick={skip}>
                ⏭️ تخطي الحركة
              </button>
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
              <PixelIcon name="cards" size={14} /> عرض الترتيب
            </button>
          </div>
        </div>
        {animOn && step < totalSteps && (
          <div className="h-1 w-full bg-card2" aria-hidden>
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, ((step + 1) / totalSteps) * 100)}%` }}
            />
          </div>
        )}
        {winningIds.length === 2 && !summary.leaderChanged && summary.maxClimb === 0 && (
          <p className="text-[10px] text-muted">لم يتغيّر الترتيب الرسمي بعد هذه المباراة.</p>
        )}
      </div>
    </Modal>
  );
}

/** Small stable fallback so rows look right before the avatar map loads. */
function fallbackAvatar(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return {
    skin: h % 8,
    hair: (h >> 3) % 8,
    hairColor: (h >> 5) % 8,
    eyes: (h >> 7) % 5,
    outfit: (h >> 9) % 8,
    accessory: (h >> 11) % 5,
  };
}
