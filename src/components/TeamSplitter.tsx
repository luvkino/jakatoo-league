"use client";

/**
 * تقسيم الفرق 🃏 — four-player pixel-art card table.
 *
 * Fairness: exactly four players from the existing دق الولد picker. On Start,
 * one genuine 52-card deck is shuffled once (crypto Fisher–Yates, see
 * src/lib/teamDraw.ts) and the whole draw is derived from that order by
 * `simulateTeamDraw` — but it stays hidden and is only revealed as the
 * animation deals each actual next card, face-up, one at a time. A team
 * forms immediately when a dealt rank matches a rank held by a different
 * unassigned player. Skip reveals that same, unchanged result instantly.
 * No reshuffle mid-draw, no replaced cards, no prearranged matches.
 *
 * Sounds use the existing Chaos `sfx` bus (central AudioManager levels /
 * global mute apply). The component never touches league data or the DB.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { PixelIcon } from "@/components/PixelArt";
import { PixelCardBack, PixelPlayingCard } from "@/components/PixelPlayingCard";
import type { PlayerRec } from "@/lib/stats";
import {
  createShuffledDeck,
  planAnimationSequence,
  REQUIRED_PLAYERS,
  simulateTeamDraw,
  TEAM_DRAW_TIMING,
  type Card,
  type TeamDrawResult,
} from "@/lib/teamDraw";

type Phase = "idle" | "shuffling" | "dealing" | "discovering" | "done";

interface FlyingCard {
  key: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  started: boolean;
}

/** Table seats in order: top, right, bottom, left. */
const SEATS = ["td-seat-top", "td-seat-right", "td-seat-bottom", "td-seat-left"] as const;

export function TeamSplitter({
  players,
  onBusyChange,
}: {
  /** The players selected in the existing draw-page picker (not duplicated). */
  players: PlayerRec[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const { sfx } = useChaos();
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<TeamDrawResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [flying, setFlying] = useState<FlyingCard | null>(null);
  const [error, setError] = useState("");

  const runTokenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const deckElRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const busy = phase === "shuffling" || phase === "dealing" || phase === "discovering";
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  const exactlyFour = players.length === REQUIRED_PLAYERS;
  const dealt = useMemo(() => result?.dealt ?? [], [result]);
  const visibleCards = useMemo(() => dealt.slice(0, revealed), [dealt, revealed]);
  /** Teams already formed by the cards revealed so far. */
  const shownTeams = useMemo(
    () => (result?.teams ?? []).filter((t) => t.formedAtDrawIndex < revealed),
    [result, revealed],
  );
  const matchedCardIds = useMemo(
    () => new Set(shownTeams.flatMap((t) => t.cardIds)),
    [shownTeams],
  );
  const teamOfPlayer = useCallback(
    (playerId: string) => shownTeams.findIndex((t) => t.playerIds.includes(playerId)),
    [shownTeams],
  );
  const cardsOf = useCallback(
    (playerId: string) => visibleCards.filter((d) => d.playerId === playerId),
    [visibleCards],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  const cancelRun = useCallback(() => {
    runTokenRef.current += 1;
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => cancelRun, [cancelRun]);

  const finish = useCallback(
    (res: TeamDrawResult, token: number) => {
      if (runTokenRef.current !== token) return;
      setPhase("discovering");
      later(() => {
        if (runTokenRef.current !== token) return;
        setPhase("done");
        if (res.status === "complete") sfx("teamReveal");
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, TEAM_DRAW_TIMING.discoveryMs);
    },
    [later, sfx],
  );

  /** Start (or Shuffle Again): a brand-new shuffled deck and a new draw. */
  const start = useCallback(() => {
    if (busy) return;
    if (!exactlyFour) {
      setError(`تقسيم الفرق يحتاج بالضبط ${REQUIRED_PLAYERS} لاعبين مختارين من قرعة «دق الولد» بالأعلى.`);
      return;
    }
    cancelRun();
    setError("");
    setFlying(null);
    setRevealed(0);
    // One genuine shuffle; the resulting order decides the entire draw.
    const deck = createShuffledDeck();
    const res = simulateTeamDraw(deck, players.map((p) => p.id));
    setResult(res);
    setPhase("shuffling");
    sfx("cardShuffle");
    const token = runTokenRef.current;
    const sequence = planAnimationSequence(res.dealt); // animation == draw order

    const step = (index: number) => {
      if (runTokenRef.current !== token) return;
      if (index >= sequence.length) {
        later(() => finish(res, token), TEAM_DRAW_TIMING.pauseMs);
        return;
      }
      const current = res.dealt[index]!;
      const arena = arenaRef.current?.getBoundingClientRect();
      const from = deckElRef.current?.getBoundingClientRect();
      const to = slotRefs.current.get(current.playerId)?.getBoundingClientRect();
      sfx("cardDraw");
      const land = () => {
        if (runTokenRef.current !== token) return;
        setFlying(null);
        setRevealed(index + 1); // flips face-up in front of its player, stays there
        sfx("cardLand");
        sfx("cardFlip");
        if (res.teams.some((t) => t.formedAtDrawIndex === index)) sfx("cardMatch");
        later(() => step(index + 1), TEAM_DRAW_TIMING.pauseMs);
      };
      if (arena && from && to) {
        const flight: FlyingCard = {
          key: current.drawIndex,
          fromX: from.left - arena.left + from.width / 2,
          fromY: from.top - arena.top + from.height / 2,
          toX: to.left - arena.left + to.width / 2,
          toY: to.top - arena.top + to.height / 2,
          started: false,
        };
        setFlying(flight);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (runTokenRef.current !== token) return;
            setFlying((f) => (f && f.key === flight.key ? { ...f, started: true } : f));
          }),
        );
        later(land, TEAM_DRAW_TIMING.moveMs);
      } else {
        later(land, TEAM_DRAW_TIMING.moveMs); // still strictly one card at a time
      }
    };

    later(() => {
      if (runTokenRef.current !== token) return;
      setPhase("dealing");
      step(0);
    }, TEAM_DRAW_TIMING.shuffleMs);
  }, [busy, exactlyFour, cancelRun, later, sfx, players, finish]);

  /** Skip: reveal the SAME draw's final state immediately — never re-draws. */
  const skip = useCallback(() => {
    if (!result || (phase !== "dealing" && phase !== "discovering" && phase !== "shuffling")) return;
    cancelRun();
    setFlying(null);
    setRevealed(result.dealt.length);
    setPhase("done");
    if (result.status === "complete") sfx("teamReveal");
  }, [result, phase, cancelRun, sfx]);

  const reset = useCallback(() => {
    cancelRun();
    setResult(null);
    setRevealed(0);
    setFlying(null);
    setError("");
    setPhase("idle");
  }, [cancelRun]);

  const nameOf = useCallback(
    (id: string) => players.find((p) => p.id === id)?.name ?? id,
    [players],
  );

  return (
    <section className="card" aria-label="تقسيم الفرق بالبطاقات">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-pixel-ar text-2xl font-extrabold">
          <PixelIcon name="cards" size={22} />
          <span>تقسيم الفرق 🃏</span>
        </h2>
        <span className="chip chip-accent tnum">{players.length} / {REQUIRED_PLAYERS} لاعبين</span>
      </div>

      <p className="mb-3 text-sm text-muted">
        طاولة ورق لأربعة لاعبين: تُخلط مجموعة حقيقية من ٥٢ بطاقة خلطاً آمناً، ثم تُوزَّع البطاقات
        مكشوفةً واحدةً تلو الأخرى من أعلى المجموعة وتبقى أمام صاحبها. أول لاعبَين يحملان{" "}
        <b>نفس الرتبة</b> (الرتبة فقط، مثل بطاقتَي Q من لونين مختلفين) يكوّنان الفريق الأول فوراً، ويستمر التوزيع
        للباقين حتى يتكوّن الفريق الثاني — دون أي إعادة خلط أو تبديل بطاقات.
      </p>

      {!exactlyFour && (
        <p role="alert" className="mb-2 text-sm font-bold text-bad">
          اختر بالضبط {REQUIRED_PLAYERS} لاعبين من قائمة «اللاعبون المشاركون» بالأعلى — لا يمكن بدء
          التقسيم بعدد مختلف.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-2 text-sm font-bold text-bad">
          {error}
        </p>
      )}

      {/* ---- Card table: top / right / bottom / left around a clear centre ---- */}
      <div ref={arenaRef} className="td-table-wrap relative border-2 border-line bg-bg p-2 sm:p-3">
        <div className="td-table">
          {(exactlyFour ? players : []).map((p, seat) => {
            const teamIdx = teamOfPlayer(p.id);
            const isCurrent = phase === "dealing" && dealt[revealed]?.playerId === p.id;
            return (
              <div key={p.id} className={`td-seat ${SEATS[seat]} ${isCurrent ? "td-seat-current" : ""}`}>
                <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
                  <span className="max-w-[9rem] truncate text-sm font-extrabold">{p.name}</span>
                  {teamIdx >= 0 && (
                    <span className={teamIdx === 0 ? "chip chip-accent" : "chip chip-good"}>
                      الفريق {teamIdx + 1} ★
                    </span>
                  )}
                </div>
                <div
                  ref={(el) => {
                    if (el) slotRefs.current.set(p.id, el);
                    else slotRefs.current.delete(p.id);
                  }}
                  className="td-hand"
                  aria-label={`بطاقات ${p.name}`}
                >
                  {cardsOf(p.id).length === 0 ? (
                    <span className="td-hand-empty">بانتظار البطاقات</span>
                  ) : (
                    cardsOf(p.id).map((d) => (
                      <span key={d.card.id} className="td-hand-card td-flip" data-card-id={d.card.id}>
                        <PixelPlayingCard card={d.card} matched={matchedCardIds.has(d.card.id)} />
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Centre: the deck, kept clear for the dealing animation. */}
          <div className="td-center">
            <div ref={deckElRef} className={`td-deck ${phase === "shuffling" ? "td-shuffling" : ""}`}>
              <span className="td-deck-layer td-deck-l3"><PixelCardBack /></span>
              <span className="td-deck-layer td-deck-l2"><PixelCardBack /></span>
              <span className="td-deck-layer td-deck-l1"><PixelCardBack /></span>
            </div>
            <span className="text-center text-[11px] font-bold text-muted tnum">
              {phase === "idle"
                ? "المجموعة جاهزة"
                : phase === "shuffling"
                  ? "جارٍ الخلط…"
                  : `متبقّي ${52 - revealed} بطاقة · وُزّعت ${revealed}`}
            </span>
            {phase === "discovering" && (
              <span className="text-center font-pixel-ar text-base font-extrabold text-accent-text">
                اكتملت الفرق!
              </span>
            )}
          </div>
        </div>

        {flying && (
          <div
            key={flying.key}
            className="td-flying"
            aria-hidden
            style={{
              transform: flying.started
                ? `translate(${flying.toX}px, ${flying.toY}px) translate(-50%, -50%) rotate(4deg)`
                : `translate(${flying.fromX}px, ${flying.fromY}px) translate(-50%, -50%) rotate(-10deg)`,
              transitionDuration: `${TEAM_DRAW_TIMING.moveMs}ms`,
            }}
          >
            <PixelCardBack />
          </div>
        )}
      </div>

      {/* ---- Controls ---- */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={start} disabled={busy || !exactlyFour}>
          <PixelIcon name="cards" size={18} />
          <span>{phase === "shuffling" ? "جارٍ الخلط…" : phase === "dealing" ? "جارٍ التوزيع…" : "بدء تقسيم الفرق"}</span>
        </button>
        <button className="btn" onClick={skip} disabled={!busy || !result}>
          <span>تخطي الحركة</span>
        </button>
        <button className="btn" onClick={start} disabled={busy || !exactlyFour}>
          <span>خلط من جديد</span>
        </button>
        <button className="btn" onClick={reset} disabled={phase === "idle" && !result}>
          <span>إعادة تعيين</span>
        </button>
      </div>
      {busy && (
        <p className="mt-2 text-xs font-bold text-muted">
          التوزيع جارٍ — الأزرار معطّلة حتى لا يعمل أكثر من توزيع واحد في الوقت نفسه، ولا يمكن تغيير
          اللاعبين المختارين الآن.
        </p>
      )}

      {/* ---- Final teams (cards stay visible on the table above) ---- */}
      {phase === "done" && result && (
        <div ref={resultsRef} className="mt-4 border-t-2 border-line pt-3" aria-live="polite">
          {result.status === "exhausted" ? (
            <p role="alert" className="text-sm font-bold text-bad">
              انتهت المجموعة (٥٢ بطاقة) قبل أن يتكوّن الفريقان من رتب متطابقة. لم تُعدَّل أي بطاقة —
              اضغط «خلط من جديد» لمحاولة جديدة بمجموعة مخلوطة حديثاً.
            </p>
          ) : (
            <>
              <h3 className="mb-2 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
                <PixelIcon name="trophy" size={18} />
                <span>الفرق النهائية</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.teams.map((team, ti) => (
                  <div key={team.rank + ti} className="td-team border-2 border-line bg-card2 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-pixel-ar text-lg font-extrabold">الفريق {ti + 1}</span>
                      <span className={ti === 0 ? "chip chip-accent" : "chip chip-good"}>
                        تطابق رتبة {team.rank}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {team.playerIds.map((pid) => {
                        const matchCard = result.dealt.find(
                          (d) => d.playerId === pid && team.cardIds.includes(d.card.id),
                        );
                        return (
                          <li key={pid} className="flex items-center gap-2">
                            {matchCard && (
                              <span className="td-result-card">
                                <PixelPlayingCard card={matchCard.card} matched />
                              </span>
                            )}
                            <span className="font-bold">{nameOf(pid)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                وُزّعت {result.cardsUsed} بطاقة من المجموعة المخلوطة. البطاقات كلها ما زالت ظاهرة على
                الطاولة بالأعلى، والبطاقات المتطابقة مميّزة بتوهّج.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
