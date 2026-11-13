// ============================================================================
// SECRET BLACKJACK — fully offline single-player blackjack.
// Player vs computer dealer, standard 52-card deck, dealer stands on 17+,
// naturals pay 3:2. Virtual "chips" live ONLY in localStorage and have zero
// real-world value: no payments, no purchases, no gambling integrations,
// no API calls — every line of game logic is client-side.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { EggModal } from "./EggModal";
import { EggSprite, PlayingCardView, ChipSprite } from "./eggArt";
import { getAch, type EggAchId } from "./eggData";
import {
  BJ_BANKRUPT_MSG,
  BJ_RESULT_TEXT,
  BJ_STATUS,
} from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";
import {
  applyRound,
  dealerShouldHit,
  freshDeck,
  handValue,
  isNatural,
  MIN_BET,
  newBlackjackStats,
  payoutMultiplier,
  roundAchievements,
  resolveRound,
  shuffleDeck,
  type BlackjackStats,
  type BjOutcome,
  type Card,
} from "./blackjackEngine";
import { readBlackjackStats, unlockEggAchievement, writeBlackjackStats } from "./eggStore";

type Phase = "bet" | "player" | "dealer" | "done";

export function BlackjackGame({
  onClose,
  sfx,
  onToast,
}: {
  onClose: () => void;
  sfx: (k: EggSfxKind) => void;
  onToast: (msg: string) => void;
}) {
  const [stats, setStats] = useState<BlackjackStats>(() => readBlackjackStats());
  const [phase, setPhase] = useState<Phase>("bet");
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [holeHidden, setHoleHidden] = useState(true);
  const [bet, setBet] = useState(MIN_BET);
  const [message, setMessage] = useState<string>(BJ_STATUS.betting);
  const [lastOutcome, setLastOutcome] = useState<BjOutcome | null>(null);

  const deckRef = useRef<Card[]>([]);
  const handsRef = useRef<{ player: Card[]; dealer: Card[] }>({ player: [], dealer: [] });
  const baseStatsRef = useRef<BlackjackStats>(stats);
  const stakeRef = useRef(MIN_BET);
  const lockedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const draw = useCallback((): Card => {
    if (deckRef.current.length < 4) deckRef.current = shuffleDeck(freshDeck());
    return deckRef.current.pop()!;
  }, []);

  const finishRound = useCallback(
    (outcome: BjOutcome, pCards: Card[]) => {
      const base = baseStatsRef.current;
      const next = applyRound(base, stakeRef.current, outcome);
      setStats(next);
      writeBlackjackStats(next);
      for (const achId of roundAchievements(outcome, pCards, base) as EggAchId[]) {
        if (unlockEggAchievement(achId)) {
          onToast(`🏆 إنجاز سري: ${getAch(achId).title}`);
          sfx("achievement");
        }
      }
      setLastOutcome(outcome);
      setMessage(BJ_RESULT_TEXT[outcome] ?? "");
      setPhase("done");
      lockedRef.current = false;
      const m = payoutMultiplier(outcome);
      sfx(m > 0 ? "win" : m < 0 ? "lose" : "push");
    },
    [onToast, sfx],
  );

  const runDealerTurn = useCallback(
    (pCards: Card[]) => {
      setPhase("dealer");
      setHoleHidden(false);
      sfx("card");
      setMessage(BJ_STATUS.dealerTurn);
      const step = () => {
        const d = handsRef.current.dealer;
        if (dealerShouldHit(d)) {
          const c = draw();
          handsRef.current.dealer = [...d, c];
          setDealer(handsRef.current.dealer);
          sfx("card");
          later(step, 750);
        } else {
          later(() => {
            const outcome = resolveRound(pCards, handsRef.current.dealer);
            finishRound(outcome, pCards);
          }, 600);
        }
      };
      later(step, 650);
    },
    [draw, finishRound, later, sfx],
  );

  const deal = useCallback(() => {
    if (lockedRef.current || stats.chips <= 0) return;
    const stake = Math.max(1, Math.min(bet, stats.chips));
    lockedRef.current = true;
    if (deckRef.current.length < 15) deckRef.current = shuffleDeck(freshDeck());
    const p = [draw(), draw()];
    const d = [draw(), draw()];
    handsRef.current = { player: p, dealer: d };
    stakeRef.current = stake;
    baseStatsRef.current = { ...stats, chips: stats.chips - stake };
    setStats(baseStatsRef.current);
    setPlayer(p);
    setDealer(d);
    setLastOutcome(null);
    setHoleHidden(true);
    setPhase("player");
    setMessage(BJ_STATUS.playerTurn);
    sfx("card");

    if (isNatural(p) || isNatural(d)) {
      later(() => {
        setHoleHidden(false);
        const outcome = resolveRound(p, d);
        finishRound(outcome, p);
      }, 950);
    } else {
      later(() => {
        lockedRef.current = false;
      }, 500);
    }
  }, [bet, draw, finishRound, later, sfx, stats]);

  const hit = useCallback(() => {
    if (lockedRef.current || phase !== "player") return;
    const c = draw();
    const p = [...handsRef.current.player, c];
    handsRef.current.player = p;
    setPlayer(p);
    sfx("card");
    const total = handValue(p).total;
    if (total > 21) {
      lockedRef.current = true;
      later(() => finishRound("player_bust", p), 700);
    } else if (total === 21) {
      lockedRef.current = true;
      later(() => runDealerTurn(p), 550);
    }
  }, [draw, finishRound, later, phase, runDealerTurn, sfx]);

  const stand = useCallback(() => {
    if (lockedRef.current || phase !== "player") return;
    lockedRef.current = true;
    runDealerTurn(handsRef.current.player);
  }, [phase, runDealerTurn]);

  const nextRound = useCallback(() => {
    setPhase("bet");
    setPlayer([]);
    setDealer([]);
    setLastOutcome(null);
    setMessage(BJ_STATUS.betting);
    setBet((b) => Math.max(1, Math.min(b, stats.chips)));
    sfx("chip");
  }, [sfx, stats.chips]);

  const restock = useCallback(() => {
    const next = { ...stats, chips: 1000 };
    setStats(next);
    writeBlackjackStats(next);
    setBet(MIN_BET);
    setMessage(BJ_STATUS.betting);
    sfx("chip");
  }, [sfx, stats]);

  const addBet = useCallback(
    (v: number) => {
      if (phase !== "bet") return;
      setBet((b) => Math.max(1, Math.min(b + v, stats.chips)));
      sfx("chip");
    },
    [phase, sfx, stats.chips],
  );

  const playerVal = handValue(player);
  const dealerVisible = holeHidden ? dealer.slice(0, 1) : dealer;
  const dealerVal = handValue(dealerVisible);

  const scoreChip = (label: string, total: number, cards: number, tone: "player" | "dealer") => (
    <span
      className={`chip ${tone === "dealer" ? "chip-bad" : "chip-good"} tnum font-pixel-en`}
      dir="ltr"
    >
      {label}: {cards > 0 ? total : "—"}
    </span>
  );

  return (
    <EggModal
      title={
        <>
          <EggSprite name="eggCards" size={20} />
          <span>طاولة البلاك جاك السرية</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <div className="stack">
        {/* Casino table */}
        <div className="egg-felt relative border-2 border-[#14532d] p-3 sm:p-4" dir="ltr">
          {/* Dealer */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2" dir="rtl">
              {scoreChip("الموزّع", dealerVal.total, dealer.length, "dealer")}
              <span className="font-pixel-en text-[10px] text-muted">DEALER 🤖</span>
            </div>
            <div className="flex min-h-[4.2rem] flex-wrap items-center justify-center gap-1.5 sm:min-h-[5.2rem]">
              {dealer.map((c, i) => (
                <PlayingCardView key={c.id} card={c} index={i} hidden={holeHidden && i === 1} />
              ))}
              {dealer.length === 0 && (
                <span className="text-xs text-white/50">بانتظار التوزيع…</span>
              )}
            </div>
          </div>

          <div className="my-2 border-t-2 border-dashed border-white/20" />

          {/* Player */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex min-h-[4.2rem] flex-wrap items-center justify-center gap-1.5 sm:min-h-[5.2rem]">
              {player.map((c, i) => (
                <PlayingCardView key={c.id} card={c} index={i} />
              ))}
              {player.length === 0 && (
                <span className="text-xs text-white/50">أوراقك تظهر هنا</span>
              )}
            </div>
            <div className="flex items-center gap-2" dir="rtl">
              {scoreChip("أنت", playerVal.total, player.length, "player")}
              <span className="font-pixel-en text-[10px] text-muted">PLAYER 🎮</span>
            </div>
          </div>
        </div>

        {/* Status message */}
        <p
          className={`text-center text-sm font-bold ${
            lastOutcome && payoutMultiplier(lastOutcome) > 0
              ? "text-good"
              : lastOutcome && payoutMultiplier(lastOutcome) < 0
                ? "text-bad"
                : "text-muted"
          }`}
          aria-live="polite"
        >
          {message}
        </p>

        {/* Chips balance */}
        <div className="flex items-center justify-center gap-2 border-2 border-line bg-card2 px-3 py-2">
          <ChipSprite size={18} />
          <span className="tnum font-pixel-en text-lg font-extrabold text-accent-text" dir="ltr">
            {stats.chips.toLocaleString("en-US")}
          </span>
          <span className="text-xs text-muted">شيبس (وهمي 100%)</span>
        </div>

        {stats.chips <= 0 ? (
          <div className="stack items-center gap-2 border-2 border-bad bg-bad/10 p-3 text-center">
            <p className="text-sm font-bold text-bad">{BJ_BANKRUPT_MSG}</p>
            <button className="btn btn-primary" onClick={restock}>
              💰 قرض رمزي: 1000 شيبس
            </button>
          </div>
        ) : phase === "bet" ? (
          <div className="stack gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
              {[10, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  className="btn btn-sm tnum"
                  onClick={() => addBet(v)}
                  disabled={stats.chips < v}
                >
                  +{v}
                </button>
              ))}
              <button className="btn btn-sm" onClick={() => addBet(stats.chips)}>
                ALL IN
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setBet(Math.min(MIN_BET, stats.chips));
                  sfx("chip");
                }}
              >
                ↺
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted">الرهان:</span>
              <span className="tnum font-pixel-en font-extrabold text-accent-text" dir="ltr">
                {Math.min(bet, stats.chips)}
              </span>
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={deal}
              disabled={bet < 1 || stats.chips < 1}
            >
              🃏 توزيع
            </button>
          </div>
        ) : phase === "player" ? (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-primary" onClick={hit}>
              ⬆ اسحب ورقة
            </button>
            <button className="btn" onClick={stand}>
              ✋ توقف
            </button>
          </div>
        ) : phase === "dealer" ? (
          <button className="btn w-full opacity-60" disabled>
            …الموزّع يلعب
          </button>
        ) : (
          <button className="btn btn-primary w-full" onClick={nextRound}>
            🔄 جولة جديدة
          </button>
        )}

        <p className="text-center text-[11px] leading-relaxed text-muted">
          🎮 لعبة سرية للترفيه فقط — الشيبس عملة افتراضية بلا أي قيمة حقيقية، ولا توجد مدفوعات
          أو مشتريات. لا علاقة لهذه الطاولة بنقاط الدوري الحقيقية إطلاقاً.
        </p>
      </div>
    </EggModal>
  );
}
