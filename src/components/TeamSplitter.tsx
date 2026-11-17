"use client";

/**
 * تقسيم الفرق 🃏 — random team split by dealing a real shuffled deck.
 *
 * Transparency: the deck is shuffled ONCE (crypto Fisher–Yates, see
 * src/lib/teamDraw.ts) before any animation. The animation then plays back
 * exactly `planAnimationSequence(dealt)`: step i physically flies deck[i]
 * to player i and flips it face-up. No card is generated, swapped or
 * re-drawn during the animation, teams are grouped purely by dealt rank,
 * and Replay always builds a brand-new shuffled deck.
 *
 * Sounds go through the existing Chaos `sfx` bus (playSfx), whose level is
 * driven centrally by AudioManager — the global mute silences them too.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { PixelIcon } from "@/components/PixelArt";
import { SUIT_GLYPH, SUIT_RED } from "@/lib/casino/cards";
import type { PlayerRec } from "@/lib/stats";
import {
  createShuffledDeck,
  dealDistribution,
  evaluateTwoTeams,
  MAX_PLAYERS,
  MIN_PLAYERS,
  planAnimationSequence,
  TEAM_DRAW_TIMING,
  type Card,
  type DealtCard,
} from "@/lib/teamDraw";

type Phase = "idle" | "shuffling" | "shuffled" | "dealing" | "discovering" | "done";

interface FlyingCard {
  key: number;
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  started: boolean;
}

const TEAM_BADGES = ["chip chip-accent", "chip chip-good", "chip chip-bad", "chip chip-legendary"];

function PlayingCardFace({ card, matched }: { card: Card; matched?: boolean }) {
  const red = SUIT_RED[card.s];
  const glyph = SUIT_GLYPH[card.s];
  return (
    <div
      className={`td-card-face ${red ? "td-red" : "td-black"} ${matched ? "td-matched" : ""}`}
      aria-label={`${card.r} ${glyph}`}
    >
      <span className="td-corner td-corner-top">
        <b>{card.r}</b>
        <i>{glyph}</i>
      </span>
      <span className="td-pip">{glyph}</span>
      <span className="td-corner td-corner-bottom">
        <b>{card.r}</b>
        <i>{glyph}</i>
      </span>
    </div>
  );
}

export function TeamSplitter({
  players,
  onBusyChange,
}: {
  /** Players selected in the existing draw-page picker (no duplicate picker). */
  players: PlayerRec[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const { sfx } = useChaos();
  const [phase, setPhase] = useState<Phase>("idle");
  const [dealt, setDealt] = useState<DealtCard[]>([]);
  const [revealed, setRevealed] = useState(0); // cards that have landed face-up
  const [flying, setFlying] = useState<FlyingCard | null>(null);
  const [deckRemaining, setDeckRemaining] = useState(52);
  const [error, setError] = useState("");

  const deckRef = useRef<Card[] | null>(null);
  const runTokenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const deckElRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const busy = phase === "shuffling" || phase === "dealing" || phase === "discovering";
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  const playerCountOk = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;
  const evaluation = useMemo(
    () => (phase === "done" || phase === "discovering" ? evaluateTwoTeams(dealt) : null),
    [phase, dealt],
  );
  const matchedRanks = useMemo(
    () => new Set(evaluation?.teams.map((t) => t.rank) ?? []),
    [evaluation],
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

  /** Shuffle a brand-new deck. The resulting order decides everything. */
  const shuffle = useCallback(() => {
    if (busy) return;
    if (!playerCountOk) {
      setError(`اختر من ${MIN_PLAYERS} إلى ${MAX_PLAYERS} لاعبين أولاً من قائمة اللاعبين بالأعلى.`);
      return;
    }
    cancelRun();
    setError("");
    setDealt([]);
    setRevealed(0);
    setFlying(null);
    deckRef.current = createShuffledDeck(); // one genuine crypto shuffle
    setDeckRemaining(52);
    setPhase("shuffling");
    sfx("cardShuffle");
    const token = runTokenRef.current;
    later(() => {
      if (runTokenRef.current !== token) return;
      setPhase("shuffled");
    }, TEAM_DRAW_TIMING.shuffleMs);
  }, [busy, playerCountOk, cancelRun, later, sfx]);

  /** Deal sequentially from the shuffled deck, animating the real draw order. */
  const deal = useCallback(() => {
    if (busy || phase !== "shuffled" || !deckRef.current) return;
    const deck = deckRef.current;
    let distribution: DealtCard[];
    try {
      distribution = dealDistribution(deck, players.map((p) => p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر التوزيع.");
      return;
    }
    const sequence = planAnimationSequence(distribution); // animation == draw order
    setDealt(distribution);
    setRevealed(0);
    setPhase("dealing");
    const token = runTokenRef.current;

    const step = (index: number) => {
      if (runTokenRef.current !== token) return;
      if (index >= sequence.length) {
        // Brief pause, then highlight matching ranks, then reveal teams.
        later(() => {
          if (runTokenRef.current !== token) return;
          setPhase("discovering");
          if (evaluateTwoTeams(distribution).teams.length > 0) sfx("cardMatch");
          later(() => {
            if (runTokenRef.current !== token) return;
            setPhase("done");
            sfx("teamReveal");
          }, TEAM_DRAW_TIMING.discoveryMs);
        }, TEAM_DRAW_TIMING.pauseMs);
        return;
      }

      const current = distribution[index]!;
      // Measure the real deck → player travel inside the arena.
      const arena = arenaRef.current?.getBoundingClientRect();
      const from = deckElRef.current?.getBoundingClientRect();
      const to = slotRefs.current.get(current.playerId)?.getBoundingClientRect();
      sfx("cardDraw");
      if (arena && from && to) {
        const flight: FlyingCard = {
          key: current.drawIndex,
          card: current.card,
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
        later(() => {
          if (runTokenRef.current !== token) return;
          setFlying(null);
          setRevealed(index + 1); // lands and flips face-up in the player's slot
          setDeckRemaining(52 - (index + 1));
          sfx("cardLand");
          sfx("cardFlip");
          later(() => step(index + 1), TEAM_DRAW_TIMING.pauseMs);
        }, TEAM_DRAW_TIMING.moveMs);
      } else {
        // No layout available: still reveal strictly one card at a time.
        later(() => {
          if (runTokenRef.current !== token) return;
          setRevealed(index + 1);
          setDeckRemaining(52 - (index + 1));
          sfx("cardFlip");
          later(() => step(index + 1), TEAM_DRAW_TIMING.pauseMs);
        }, TEAM_DRAW_TIMING.moveMs);
      }
    };
    step(0);
  }, [busy, phase, players, later, sfx]);

  /** Replay = a completely new shuffle and a new random result. */
  const replay = useCallback(() => {
    if (busy) return;
    cancelRun();
    deckRef.current = null;
    setDealt([]);
    setRevealed(0);
    setFlying(null);
    setPhase("idle");
    // Start the fresh shuffle immediately (new deck, new order).
    later(() => shuffle(), 30);
  }, [busy, cancelRun, later, shuffle]);

  const reset = useCallback(() => {
    cancelRun();
    deckRef.current = null;
    setDealt([]);
    setRevealed(0);
    setFlying(null);
    setDeckRemaining(52);
    setError("");
    setPhase("idle");
  }, [cancelRun]);

  const cardFor = useCallback(
    (playerId: string, index: number): DealtCard | null =>
      index < revealed ? (dealt.find((d) => d.playerId === playerId) ?? null) : null,
    [dealt, revealed],
  );

  return (
    <section className="card" aria-label="تقسيم الفرق بالبطاقات">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-pixel-ar text-2xl font-extrabold">
          <PixelIcon name="cards" size={22} />
          <span>تقسيم الفرق 🃏</span>
        </h2>
        <span className="chip chip-accent tnum">
          {players.length} لاعب مختار
        </span>
      </div>

      <p className="mb-3 text-sm text-muted">
        تُخلط مجموعة ورق حقيقية من ٥٢ بطاقة خلطاً عشوائياً آمناً، ثم تُوزَّع بطاقة واحدة لكل لاعب
        بالترتيب من أعلى المجموعة. <b>اللاعبان اللذان يحملان نفس الرتبة</b> (مثل Q♠ و Q♦) يصبحان في
        فريق واحد — الرتبة المتطابقة هي العامل الوحيد، ولا تُعدَّل أي بطاقة أو نتيجة بعد الخلط.
      </p>

      {!playerCountOk && (
        <p role="alert" className="mb-2 text-sm font-bold text-bad">
          اختر من {MIN_PLAYERS} إلى {MAX_PLAYERS} لاعبين من قائمة «اللاعبون المشاركون» بالأعلى لبدء
          تقسيم الفرق.
        </p>
      )}
      {playerCountOk && players.length % 2 !== 0 && phase !== "done" && (
        <p className="mb-2 text-sm font-bold text-accent-text">
          تنبيه: عدد اللاعبين فردي ({players.length})، لذلك لا يمكن تكوين فريقين <i>متساويين</i> —
          ستتكوّن الفرق حسب الرتب الموزَّعة فعلياً كما هي، دون حذف أي لاعب أو اختراع بطاقات مطابقة.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-2 text-sm font-bold text-bad">
          {error}
        </p>
      )}

      {/* Arena: deck in the centre, players around it. */}
      <div ref={arenaRef} className="td-arena relative border-2 border-line bg-bg p-3 sm:p-4">
        <div className="mb-4 flex flex-col items-center gap-1.5">
          <div
            ref={deckElRef}
            className={`td-deck ${phase === "shuffling" ? "td-shuffling" : ""}`}
            aria-label="مجموعة الورق"
          >
            <span className="td-deck-layer td-deck-l3" aria-hidden />
            <span className="td-deck-layer td-deck-l2" aria-hidden />
            <span className="td-deck-layer td-deck-l1 td-card-back" aria-hidden>
              <PixelIcon name="cards" size={26} />
            </span>
          </div>
          <span className="text-xs font-bold text-muted tnum">
            {phase === "idle"
              ? "المجموعة جاهزة للخلط"
              : phase === "shuffling"
                ? "جارٍ الخلط…"
                : `بطاقات متبقية في المجموعة: ${deckRemaining}`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {players.map((p, i) => {
            const landed = cardFor(p.id, i);
            const isCurrent =
              phase === "dealing" && dealt[revealed]?.playerId === p.id;
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center gap-1.5 border-2 p-2 ${
                  isCurrent ? "border-accent bg-card2" : "td-player-slot border-line bg-card"
                }`}
              >
                <span className="max-w-full truncate text-sm font-extrabold">{p.name}</span>
                <div
                  ref={(el) => {
                    if (el) slotRefs.current.set(p.id, el);
                    else slotRefs.current.delete(p.id);
                  }}
                  className="td-slot grid place-items-center"
                >
                  {landed ? (
                    <div
                      key={landed.card.id}
                      className="td-flip"
                      data-draw-index={landed.drawIndex}
                      data-card-id={landed.card.id}
                    >
                      <PlayingCardFace
                        card={landed.card}
                        matched={
                          (phase === "discovering" || phase === "done") &&
                          matchedRanks.has(landed.card.r)
                        }
                      />
                    </div>
                  ) : (
                    <div className="td-card-empty" aria-hidden>
                      {isCurrent ? "…" : "؟"}
                    </div>
                  )}
                </div>
                {landed && (
                  <span className="text-[11px] font-bold text-muted">
                    البطاقة رقم {landed.drawIndex + 1} في التوزيع
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {flying && (
          <div
            key={flying.key}
            className="td-flying td-card-back"
            aria-hidden
            style={{
              transform: flying.started
                ? `translate(${flying.toX}px, ${flying.toY}px) translate(-50%, -50%) rotate(4deg)`
                : `translate(${flying.fromX}px, ${flying.fromY}px) translate(-50%, -50%) rotate(-10deg)`,
              transitionDuration: `${TEAM_DRAW_TIMING.moveMs}ms`,
            }}
          >
            <PixelIcon name="cards" size={22} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn" onClick={shuffle} disabled={busy || !playerCountOk}>
          <PixelIcon name="dice" size={18} />
          <span>{phase === "shuffling" ? "جارٍ الخلط…" : "خلط الورق"}</span>
        </button>
        <button
          className="btn btn-primary"
          onClick={deal}
          disabled={busy || phase !== "shuffled"}
        >
          <PixelIcon name="cards" size={18} />
          <span>{phase === "dealing" ? "جارٍ التوزيع…" : "بدء التوزيع"}</span>
        </button>
        {(phase === "done" || phase === "shuffled") && !busy && (
          <button className="btn" onClick={replay}>
            <span>إعادة التوزيع (خلط جديد)</span>
          </button>
        )}
        {phase !== "idle" && (
          <button className="btn" onClick={reset} disabled={phase === "dealing" || phase === "shuffling"}>
            <span>إعادة تعيين</span>
          </button>
        )}
        {phase === "done" && (
          <button
            className="btn"
            onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <span>عرض الفرق النهائية</span>
          </button>
        )}
      </div>
      {busy && (
        <p className="mt-2 text-xs font-bold text-muted">
          التوزيع جارٍ — لا يمكن تغيير اللاعبين المختارين أو بدء توزيع آخر حتى ينتهي.
        </p>
      )}

      {/* Discovery + final teams */}
      {evaluation && (phase === "discovering" || phase === "done") && (
        <div ref={resultsRef} className="mt-4 border-t-2 border-line pt-3" aria-live="polite">
          {phase === "discovering" ? (
            <p className="text-center font-pixel-ar text-xl font-extrabold text-accent-text">
              جارٍ اكتشاف الرتب المتطابقة…
            </p>
          ) : (
            <>
              <h3 className="mb-2 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
                <PixelIcon name="trophy" size={18} />
                <span>الفرق النهائية</span>
              </h3>

              {evaluation.status === "two-teams" ? (
                <p className="mb-2 text-sm font-bold text-good">
                  تشكّل فريقان من البطاقات الموزَّعة فعلياً
                  {evaluation.teams[0]!.members.length !== evaluation.teams[1]!.members.length &&
                    " — حجما الفريقين غير متساويين لأن هذا ما أنتجته الرتب، ولم يتم نقل أي لاعب لموازنتهما"}
                  .
                </p>
              ) : evaluation.status === "partial-matches" ? (
                <p role="alert" className="mb-2 text-sm font-bold text-bad">
                  لم يتشكّل فريقان فقط من هذه التوزيعة: ظهرت {evaluation.distinctRanks} رتب مختلفة
                  بين {evaluation.playerCount} لاعبين، فالرتب المتطابقة وحدها لا تكفي لفريقين.
                  هذه هي النتيجة الحقيقية للخلط — والبديل الصحيح هو «إعادة التوزيع (خلط جديد)»
                  بمجموعة جديدة، وليس تعديل البطاقات.
                </p>
              ) : (
                <p role="alert" className="mb-2 text-sm font-bold text-bad">
                  كل لاعب سحب رتبة مختلفة، فلم يتشكّل أي فريق من التطابق في هذه التوزيعة.
                  هذه نتيجة حقيقية للخلط العشوائي — جرّب «إعادة التوزيع (خلط جديد)» لمحاولة جديدة
                  عادلة.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {evaluation.teams.map((team, ti) => (
                  <div key={team.rank} className="td-team border-2 border-line bg-card2 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-pixel-ar text-lg font-extrabold">
                        الفريق {ti + 1} — رتبة {team.rank}
                      </span>
                      <span className={TEAM_BADGES[ti % TEAM_BADGES.length]}>
                        {team.members.length} لاعبين
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {team.members.map((m) => {
                        const player = players.find((p) => p.id === m.playerId);
                        return (
                          <li key={m.playerId} className="flex items-center gap-2">
                            <PlayingCardFace card={m.card} matched />
                            <span className="font-bold">{player?.name ?? m.playerId}</span>
                            <span className="text-xs text-muted">
                              ({m.card.r}
                              {SUIT_GLYPH[m.card.s]})
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {evaluation.unmatched.length > 0 && (
                <p className="mt-2 text-sm text-muted">
                  لاعبون بلا فريق (رتب وحيدة لم تتطابق مع أحد):{" "}
                  {evaluation.unmatched
                    .map((m) => `${players.find((p) => p.id === m.playerId)?.name ?? m.playerId} (${m.card.r}${SUIT_GLYPH[m.card.s]})`)
                    .join("، ")}
                  .
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
