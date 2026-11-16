"use client";

/**
 * CASINO TABLE — the in-game blackjack table.
 *
 * Layout: dealer at the top, player hands at the bottom, betting bar below the
 * felt. All state comes from `useCasino` (engine + store); this component only
 * renders and dispatches. Every action the table rules forbid is rendered
 * disabled with the exact reason as its title/aria-description, so the player
 * always knows *why* something is unavailable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelArt";
import { Chip, ChipRow, DealerShoe, PlayingCard, TableSurface } from "./CasinoArt";
import { useCasino } from "./useCasino";
import { BASIC_STRATEGY, advise, STRATEGY_LEGEND } from "@/lib/casino/strategy";
import { SIDE_BET_PAYTABLE, SIDE_BET_LABEL_AR, type SideBetId } from "@/lib/casino/sideBets";
import { TABLE_MAP } from "@/lib/casino/tables";
import { CHIP_DENOMINATIONS, chipsFor, clampBet } from "@/lib/casino/settlement";
import { handValue } from "@/lib/casino/cards";
import { dealerVisible, handStake, awaitingInsurance } from "@/lib/casino/engine";
import { playCasinoSfx } from "@/lib/casino/sound";
import { OUTCOME_LABEL_AR, outcomeTone } from "@/lib/casino/stats";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";
import { pulseShake } from "@/components/prefs/ScreenShake";
import { shakeAmplitude, shakeActive } from "@/lib/prefs";

const DENOMS = [...CHIP_DENOMINATIONS].filter((d) => d >= 5);

export function CasinoTable({ onExit, onOpenRules }: { onExit?: () => void; onOpenRules?: () => void }) {
  const {
    game,
    store,
    balance,
    rules,
    moves,
    message,
    lastSettlement,
    deal,
    act,
    nextRound,
    revealDealer,
  } = useCasino();
  const { prefs, reducedMotion } = usePlayerPrefs();

  const table = TABLE_MAP[store.tableId];
  const [bet, setBet] = useState<number>(() => Math.max(rules.minBet, Math.min(store.lastBet || rules.minBet, rules.maxBet)));
  const [side, setSide] = useState<Record<string, number>>(() =>
    Object.fromEntries(store.lastSideBets.map((s) => [s.id, s.stake])),
  );
  const [betHistory, setBetHistory] = useState<number[]>([]);
  const [showStrategy, setShowStrategy] = useState(store.settings.showStrategyHint);
  const [celebrate, setCelebrate] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const prevPhase = useRef(game.phase);

  // Safety net: the engine only hands the dealer's turn to the UI in one edge
  // case (a hand that finished on exactly 21 with more bets still live), so we
  // resolve it here rather than leaving the table stuck.
  useEffect(() => {
    if (game.phase !== "dealer") return;
    const t = window.setTimeout(revealDealer, 700);
    return () => window.clearTimeout(t);
  }, [game.phase, revealDealer]);

  const sideTotal = useMemo(
    () => Object.entries(side).reduce((sum, [id, v]) => (rules.sideBets.includes(id as SideBetId) ? sum + (v ?? 0) : sum), 0),
    [side, rules.sideBets],
  );
  const totalAtRisk = bet + sideTotal;
  const insufficient = totalAtRisk > balance;

  /* ---------------------------------------------------------- feedback */

  const impact = useCallback(
    (strength: number) => {
      if (!shakeActive(prefs, reducedMotion)) return;
      const amp = shakeAmplitude(prefs.shakeIntensity);
      if (amp > 0) pulseShake(strength, 240);
    },
    [prefs, reducedMotion],
  );

  useEffect(() => {
    if (prevPhase.current === game.phase) return;
    prevPhase.current = game.phase;
    if (game.phase !== "settled") return;

    const anyBJ = game.hands.some((h) => h.outcome === "blackjack");
    const anyBustDealer = game.hands.some((h) => h.outcome === "dealer_bust");
    const anyWin = game.hands.some((h) => h.outcome === "win" || h.outcome === "blackjack" || h.outcome === "dealer_bust");
    const allLose = game.hands.every((h) => h.outcome === "lose" || h.outcome === "bust" || h.outcome === "surrender");

    // All feedback (sound, shake pulse, celebration flags) is deferred one
    // tick so it never runs synchronously inside the effect body — React 19
    // treats that as a cascading render. The visual result is identical.
    const controls: { stop: () => void }[] = [];
    const timer = window.setTimeout(() => {
      if (anyBJ) {
        playCasinoSfx("blackjack");
        impact(1.4);
        setCelebrate(true);
        controls.push({ stop: () => setCelebrate(false) });
      } else if (anyBustDealer) {
        playCasinoSfx("dealerBust");
        impact(1);
      } else if (anyWin) {
        playCasinoSfx("win");
        impact(0.7);
      } else if (allLose) {
        playCasinoSfx("lose");
      } else {
        playCasinoSfx("push");
      }
      setCollecting(true);
      setShowSummary(true);
      setBetHistory((h) => [...h.slice(-19), game.hands[0]?.stake ?? bet]);
      controls.push({
        stop: () => {
          setCollecting(false);
          setCelebrate(false);
        },
      });
    }, 0);
    const clear = window.setTimeout(() => controls.forEach((c) => c.stop()), 2200);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [game.phase, game.hands, bet, impact]);

  /* ------------------------------------------------------------ betting */

  const addChip = (value: number) => {
    const next = clampBet(bet + value, balance - sideTotal, rules.maxBet);
    if (next === bet) return;
    setBet(next);
    playCasinoSfx("chipPlace");
  };
  const allIn = () => {
    if (store.settings.confirmAllIn && bet < balance) {
      const ok = window.confirm(`سيتم وضع كل رصيدك (${balance.toLocaleString("en-US")} شيبس) على هذه الجولة. متابعة؟`);
      if (!ok) return;
    }
    setBet(clampBet(balance - sideTotal, balance, rules.maxBet));
    playCasinoSfx("chipPlace");
  };
  const rebet = () => {
    const prev = store.lastBet || rules.minBet;
    setBet(clampBet(prev, balance - sideTotal, rules.maxBet));
    setSide(Object.fromEntries(store.lastSideBets.map((s) => [s.id, s.stake])));
    playCasinoSfx("bet");
  };
  const clearBet = () => {
    setBet(0);
    setSide({});
    playCasinoSfx("button");
  };
  const undo = () => setBet((b) => Math.max(0, b - 5));

  const canDeal = game.phase === "betting" && bet >= rules.minBet && bet <= rules.maxBet && !insufficient;

  const doDeal = () => {
    const sideBets = Object.entries(side).map(([id, stake]) => ({ id: id as SideBetId, stake }));
    deal({ bet, sideBets });
  };

  /* -------------------------------------------------------------- render */

  const dv = dealerVisible(game);
  const activeIdx = game.activeHand;
  const isSettled = game.phase === "settled";
  const strategyHint = useMemo(() => {
    const h = game.hands[activeIdx];
    if (!h || game.phase !== "player" || !dv.cards.length) return null;
    const v = handValue(h.cards);
    const pair = h.cards.length === 2 && h.cards[0]!.r === h.cards[1]!.r;
    return advise(v.total, v.soft, pair, dv.cards[0]!.r);
  }, [game.hands, game.phase, activeIdx, dv.cards]);

  const insuranceOffered = awaitingInsurance(game);

  return (
    <div className="stack !gap-3">
      {/* Header strip */}
      <div className="cas-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-pixel-en text-[10px] tracking-widest text-[#d9b658]">JACKAROO CASINO</span>
          <span className="cas-chip-line">
            {table?.name ?? "طاولة"} · {rules.decks}D · {rules.dealerHitsSoft17 ? "H17" : "S17"} ·{" "}
            {rules.blackjackPayout === 1.5 ? "3:2" : "6:5"}
          </span>
          {store.practice && <span className="cas-chip-line !border-[#5ab0ff] !text-[#bfe3ff]">وضع التدريب</span>}
        </div>
        <div className="flex items-center gap-2">
          <DealerShoe remaining={game.shoe.length} total={game.shoeStart} />
          <div className="text-end">
            <div className="text-[9px] uppercase tracking-widest text-[#b9a486]">الرصيد المتاح</div>
            <div className="tnum font-pixel-en text-sm font-extrabold text-[#f0d79a]" dir="ltr">
              {balance.toLocaleString("en-US")}
            </div>
          </div>
        </div>
      </div>

      <TableSurface
        banner="JACKAROO CASINO"
        payline={`BLACKJACK PAYS ${rules.blackjackPayout === 1.5 ? "3 TO 2" : "6 TO 5"}${
          rules.surrender === "none" ? "" : " · SURRENDER ALLOWED"
        }`}
        dealerLine={`DEALER MUST ${rules.dealerHitsSoft17 ? "HIT SOFT 17" : "STAND ON ALL 17s"}${
          rules.dealerPeek ? " · PEEKS FOR BLACKJACK" : ""
        }`}
      >
        {/* Dealer */}
        <div className="relative z-[1] flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="cas-total">
              الموزّع {game.dealer.length ? dv.total : "—"}
              {game.holeHidden && game.dealer.length > 1 ? "+" : ""}
            </span>
            {game.dealer.length > 0 && handValue(game.dealer).total > 21 && (
              <span className="cas-total cas-total-bust">انفجر</span>
            )}
          </div>
          <div className="flex min-h-[86px] flex-wrap items-start justify-center gap-1.5">
            {game.dealer.map((c, i) => (
              <PlayingCard key={c.id} card={c} hidden={game.holeHidden && i === 1} index={i} />
            ))}
            {game.dealer.length === 0 && (
              <span className="grid h-[80px] place-items-center px-4 text-xs text-[#e8dcc0]/40">
                بانتظار التوزيع…
              </span>
            )}
          </div>
        </div>

        <div className="relative z-[1] my-2 border-t border-dashed border-[#f0d79a]/15" />

        {/* Player hands */}
        <div className="relative z-[1] flex flex-wrap items-end justify-center gap-2">
          {game.hands.length === 0 && (
            <span className="grid h-[80px] place-items-center px-4 text-xs text-[#e8dcc0]/40">أوراقك تظهر هنا</span>
          )}
          {game.hands.map((h, i) => {
            const v = handValue(h.cards);
            const tone =
              h.outcome === "blackjack" || h.outcome === "win" || h.outcome === "dealer_bust"
                ? " cas-total-win"
                : h.outcome === "lose" || h.outcome === "bust"
                  ? " cas-total-bust"
                  : "";
            return (
              <div
                key={h.id}
                className={`cas-hand ${i === activeIdx && game.phase === "player" ? "cas-hand-active" : ""} ${
                  h.done ? "cas-hand-done" : ""
                } ${isSettled && tone.includes("win") ? "cas-win-glow" : ""}`}
              >
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <span className={`cas-total${v.soft ? " cas-total-soft" : ""}${tone}`}>
                    {v.total}
                    {v.soft ? " ناعم" : ""}
                  </span>
                  {h.doubled && <span className="cas-total">×2</span>}
                  {h.fromSplit && <span className="cas-total">مقسوم</span>}
                  {h.outcome && (
                    <span className={`cas-total${tone}`}>{OUTCOME_LABEL_AR[h.outcome]}</span>
                  )}
                </div>
                <div className="flex items-start justify-center gap-1">
                  {h.cards.map((c, ci) => (
                    <PlayingCard key={c.id} card={c} index={ci} size={game.hands.length > 2 ? "sm" : "md"} highlight={i === activeIdx && game.phase === "player"} />
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  {chipsFor(handStake(h)).slice(0, 3).map((stack) => (
                    <Chip key={stack.denom} value={stack.denom} count={stack.count} size={18} />
                  ))}
                  <span className="tnum font-pixel-en text-[10px] text-[#f0d79a]" dir="ltr">
                    {handStake(h)}
                  </span>
                </div>
                {h.net !== 0 && h.settled && (
                  <div
                    className={`cas-float-up mt-0.5 text-center font-pixel-en text-[10px] ${
                      h.net > 0 ? "text-[#7ef0b0]" : "text-[#ff9aa5]"
                    }`}
                    dir="ltr"
                  >
                    {h.net > 0 ? "+" : ""}
                    {h.net}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Betting circle */}
        <div className="relative z-[1] mt-3 flex min-h-[46px] flex-wrap items-center justify-center gap-2 border-t border-dashed border-[#f0d79a]/15 pt-2">
          {game.phase === "betting" ? (
            <>
              <span className="text-[10px] uppercase tracking-widest text-[#b9a486]">الرهان</span>
              <div className="flex items-end gap-1">
                {chipsFor(bet).length === 0 && <span className="cas-total">0</span>}
                {chipsFor(bet).slice(0, 4).map((s) => (
                  <Chip key={s.denom} value={s.denom} count={s.count} size={26} />
                ))}
              </div>
              <span className="tnum font-pixel-en text-sm text-[#f0d79a]" dir="ltr">
                {bet.toLocaleString("en-US")}
              </span>
              {sideTotal > 0 && (
                <span className="cas-chip-line">
                  جانبي: <b dir="ltr">{sideTotal}</b>
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {game.sideBets.map((b) => {
                const res = game.sideBetResults.find((r) => r.id === b.id);
                return (
                  <span key={b.id} className={`cas-chip-line ${res && res.payout > 0 ? "!border-[#7ef0b0]" : ""}`}>
                    {SIDE_BET_LABEL_AR[b.id]}: <b dir="ltr">{b.stake}</b>
                    {res ? (res.payout > 0 ? ` → +${res.payout}` : " ✗") : ""}
                  </span>
                );
              })}
              {game.insurance.stake > 0 && (
                <span className={`cas-chip-line ${game.insurance.result === "win" ? "!border-[#7ef0b0]" : ""}`}>
                  تأمين <b dir="ltr">{game.insurance.stake}</b>
                  {game.insurance.result === "win" ? ` → +${game.insurance.payout}` : " ✗"}
                </span>
              )}
            </div>
          )}
        </div>
      </TableSurface>

      {/* Message */}
      {(message || game.notes.length > 0) && (
        <div className="cas-panel px-3 py-2 text-xs" role="status" aria-live="polite">
          {message ? (
            <span className="text-[#ff9aa5]">⚠ {message}</span>
          ) : (
            <span className="text-[#b9a486]">{game.notes[game.notes.length - 1]}</span>
          )}
        </div>
      )}

      {/* Insurance prompt */}
      {insuranceOffered && (
        <div className="cas-panel !border-[#8a6a22] px-3 py-2">
          <p className="mb-2 text-sm">
            ورقة الموزّع <b>آس</b>. هل تريد التأمين بنصف الرهان (<b dir="ltr">{Math.ceil(handStake(game.hands[0]!) / 2)}</b>{" "}
            شيبس)؟ يدفع ٢:١ إذا كان لدى الموزّع بلاك جاك.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="cas-btn cas-btn-gold cas-btn-sm" onClick={() => act({ type: "insurance", take: true })}>
              نعم، تأمين
            </button>
            <button type="button" className="cas-btn cas-btn-sm" onClick={() => act({ type: "insurance", take: false })}>
              لا شكراً
            </button>
            {moves.evenMoney.allowed && (
              <button
                type="button"
                className="cas-btn cas-btn-felt cas-btn-sm"
                onClick={() => act({ type: "evenMoney" })}
                title="اقبض ١:١ على البلاك جاك مباشرة"
              >
                المال المتساوي (١:١)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions / betting bar */}
      {game.phase === "betting" && (
        <div className="cas-panel stack !gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f0d79a]">ضع رهانك</span>
              <span className="text-[10px] text-[#b9a486]">
                الحدود {rules.minBet.toLocaleString("en-US")}–{rules.maxBet.toLocaleString("en-US")} · المتبقي{" "}
                {Math.max(0, balance - sideTotal).toLocaleString("en-US")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="cas-btn cas-btn-sm" onClick={undo} disabled={bet <= 0} title="تراجع عن آخر شريحة">
                ↶ تراجع
              </button>
              <button type="button" className="cas-btn cas-btn-sm" onClick={clearBet} disabled={bet === 0 && sideTotal === 0}>
                مسح
              </button>
              <button
                type="button"
                className="cas-btn cas-btn-sm"
                onClick={rebet}
                disabled={!store.lastBet && store.lastSideBets.length === 0}
                title="أعد آخر رهان سابق"
              >
                <PixelIcon name="dice" size={12} /> إعادة الرهان
              </button>
              <button type="button" className="cas-btn cas-btn-sm cas-btn-danger" onClick={allIn} disabled={balance <= 0}>
                الكل
              </button>
            </div>
          </div>

          <ChipRow denominations={DENOMS} balance={Math.max(0, balance - sideTotal)} onPick={addChip} disabled={game.phase !== "betting"} />

          {rules.sideBets.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-[#f0d79a]">المراهنات الجانبية (اختيارية)</span>
                <span className="text-[10px] text-[#b9a486]">تُسوَّى باستقلال عن اليد الرئيسية</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {rules.sideBets.map((id) => {
                  const value = side[id] ?? 0;
                  const maxStake = SIDE_BET_PAYTABLE[id][0]?.to === 1000 ? 100 : 500;
                  return (
                    <div key={id} className="border border-[#4a351f] bg-black/25 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold">{SIDE_BET_LABEL_AR[id]}</span>
                        <span className="tnum font-pixel-en text-[10px] text-[#f0d79a]" dir="ltr">
                          {value}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={maxStake}
                        step={1}
                        value={value}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setSide((s) => ({ ...s, [id]: v }));
                        }}
                        className="audio-range !h-5"
                        aria-label={`رهان جانبي ${SIDE_BET_LABEL_AR[id]}`}
                      />
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] text-[#b9a486]">جدول الدفع</summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-[#d9c9a8]">
                          {SIDE_BET_PAYTABLE[id].map((tier) => (
                            <li key={tier.key} className="flex justify-between gap-2">
                              <span>{tier.label}</span>
                              <b dir="ltr">{tier.to}:1</b>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insufficient && (
            <p className="text-[11px] text-[#ff9aa5]">
              الرصيد لا يكفي لهذا الرهان (المطلوب {totalAtRisk.toLocaleString("en-US")}، المتاح{" "}
              {balance.toLocaleString("en-US")}).
            </p>
          )}
          {bet > 0 && bet < rules.minBet && (
            <p className="text-[11px] text-[#ff9aa5]">أقل رهان على هذه الطاولة هو {rules.minBet}.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cas-btn cas-btn-gold"
                onClick={doDeal}
                disabled={!canDeal}
                title={canDeal ? "وزّع الأوراق" : "أكمل رهاناً صحيحاً أولاً"}
              >
                <PixelIcon name="cards" size={16} /> وزّع الأوراق
              </button>
              <button
                type="button"
                className={`cas-btn cas-btn-sm ${showStrategy ? "cas-btn-felt" : ""}`}
                onClick={() => setShowStrategy((v) => !v)}
                title="إظهار تلميح الاستراتيجية الأساسية"
              >
                <PixelIcon name="target" size={12} /> التلميح
              </button>
              {onOpenRules && (
                <button type="button" className="cas-btn cas-btn-sm" onClick={onOpenRules}>
                  القواعد
                </button>
              )}
            </div>
            <div className="tnum font-pixel-en text-xs text-[#f0d79a]" dir="ltr">
              {bet.toLocaleString("en-US")}
              {sideTotal > 0 ? ` + ${sideTotal}` : ""}
            </div>
          </div>

          {showStrategy && (
            <div className="border border-[#4a351f] bg-black/30 p-2 text-[11px]">
              <div className="mb-1 font-bold text-[#f0d79a]">الاستراتيجية الأساسية</div>
              <p className="text-[#b9a486]">
                التلميح يعتمد على الجداول القياسية (٤–٨ مجموعات، S17، DAS). راجع القسم الكامل في «الاستراتيجية».
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-center">
                  <thead>
                    <tr>
                      <th className="p-1 text-[9px] text-[#b9a486]">يدك</th>
                      {["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"].map((u) => (
                        <th key={u} className="p-1 font-pixel-en text-[9px] text-[#f0d79a]">
                          {u}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BASIC_STRATEGY.hard.slice(-7).map((row) => (
                      <tr key={row.label}>
                        <th className="p-1 font-pixel-en text-[9px] text-[#d9c9a8]">{row.label}</th>
                        {row.moves.map((m, i) => (
                          <td key={i} className={`cas-chart-cell cas-chart-${m}`}>
                            {m}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-[#b9a486]">
                {STRATEGY_LEGEND.slice(0, 5).map((l) => (
                  <span key={l.code}>
                    <b className={`cas-chart-cell cas-chart-${l.code} inline-grid !min-h-0 px-1`}>{l.code}</b> {l.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {game.phase === "player" && !insuranceOffered && (
        <div className="cas-panel p-3">
          {showStrategy && strategyHint && (
            <p className="mb-2 text-[11px] text-[#7ef0b0]">
              التلميح: <b>{strategyHint.label}</b> ({strategyHint.code})
            </p>
          )}
          <div className="cas-action-bar">
            <ActionButton label="سحب" icon="bolt" onClick={() => act({ type: "hit" })} move={moves.hit} primary />
            <ActionButton label="توقف" icon="handshake" onClick={() => act({ type: "stand" })} move={moves.stand} />
            <ActionButton
              label="مضاعفة"
              icon="coin"
              onClick={() => act({ type: "double" })}
              move={moves.double}
              hint={moves.double.allowed ? `رهان إضافي ${handStake(game.hands[activeIdx]!)}` : undefined}
            />
            <ActionButton label="تقسيم" icon="cards" onClick={() => act({ type: "split" })} move={moves.split} />
            <ActionButton
              label="استسلام"
              icon="shield"
              onClick={() => act({ type: "surrender" })}
              move={moves.surrender}
              hint={moves.surrender.allowed ? "تستعيد نصف الرهان" : undefined}
              danger
            />
          </div>
          <p className="mt-2 text-[10px] text-[#b9a486]">
            المضاعفة والتقسيم والاستسلام تتاح فقط عند السماح بها على هذه الطاولة — مرّر المؤشر على الزر المعطّل لمعرفة
            السبب.
          </p>
        </div>
      )}

      {game.phase === "dealer" && (
        <div className="cas-panel px-3 py-3 text-center text-sm">
          <span className="cas-shimmer inline-block bg-clip-text">…الموزّع يلعب</span>
        </div>
      )}

      {isSettled && (
        <RoundSummary
          game={game}
          balance={balance}
          lastSettlement={lastSettlement}
          practice={store.practice}
          onNext={nextRound}
          onExit={onExit}
          celebrate={celebrate}
          showSummary={showSummary}
          onCloseSummary={() => setShowSummary(false)}
        />
      )}

      {/* Betting history */}
      {betHistory.length > 0 && (
        <div className="cas-panel px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-[#b9a486]">سجل الرهانات</div>
          <div className="flex flex-wrap gap-1">
            {betHistory.slice(-12).map((v, i) => (
              <span key={i} className="cas-chip-line" dir="ltr">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[10px] leading-relaxed text-[#b9a486]">
        🎰 شيبس افتراضية للترفيه فقط — بلا مدفوعات أو مشتريات أو قيمة حقيقية. منفصلة تماماً عن نقاط الدوري وترتيبه.
        {store.practice && " أنت في وضع التدريب: لا تُستخدم شيبس حقيقية."}
      </p>
      <div className="flex justify-center">
        <Link href="/casino" className="cas-btn cas-btn-sm" onClick={() => playCasinoSfx("button")}>
          <PixelIcon name="home" size={12} /> العودة إلى اللوبي
        </Link>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  move,
  primary,
  danger,
  hint,
}: {
  label: string;
  icon: "bolt" | "handshake" | "coin" | "cards" | "shield";
  onClick: () => void;
  move: { allowed: boolean; reason?: string };
  primary?: boolean;
  danger?: boolean;
  hint?: string;
}) {
  const disabled = !move.allowed;
  return (
    <button
      type="button"
      className={`cas-btn ${primary ? "cas-btn-gold" : danger ? "cas-btn-danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? move.reason : hint}
      /* reason is surfaced through title + the visible hint paragraph */
    >
      <PixelIcon name={icon} size={14} />
      <span>{label}</span>
      {hint && !disabled && <span className="hidden text-[9px] opacity-80 sm:inline">{hint}</span>}
    </button>
  );
}

function RoundSummary({
  game,
  balance,
  lastSettlement,
  practice,
  onNext,
  onExit,
  celebrate,
  showSummary,
  onCloseSummary,
}: {
  game: ReturnType<typeof useCasino>["game"];
  balance: number;
  lastSettlement: { net: number; returned: number; reserved: number } | null;
  practice: boolean;
  onNext: () => void;
  onExit?: () => void;
  celebrate: boolean;
  showSummary: boolean;
  onCloseSummary: () => void;
}) {
  const settled = game.hands.filter((h) => h.settled);
  const net = settled.reduce((sum, h) => sum + h.net, 0) + game.sideBetResults.reduce((s, r) => s + r.net, 0) +
    (game.insurance.result === "win" ? game.insurance.payout - game.insurance.stake : -game.insurance.stake);
  const bj = settled.some((h) => h.outcome === "blackjack");

  return (
    <div className={`cas-panel stack !gap-2 p-3 ${bj ? "cas-blackjack-banner" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {bj ? (
            <span className="font-pixel-en text-lg text-[#f0d79a]">★ BLACKJACK ★</span>
          ) : (
            <span className="font-pixel-en text-sm text-[#f0d79a]">
              {net > 0 ? "WIN" : net < 0 ? "LOSS" : "PUSH"}
            </span>
          )}
          <span className={`tnum font-pixel-en text-sm ${net > 0 ? "text-[#7ef0b0]" : net < 0 ? "text-[#ff9aa5]" : "text-[#b9a486]"}`} dir="ltr">
            {net > 0 ? "+" : ""}
            {net}
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="cas-btn cas-btn-gold cas-btn-sm" onClick={onNext}>
            <PixelIcon name="dice" size={12} /> جولة جديدة
          </button>
          {onExit && (
            <button type="button" className="cas-btn cas-btn-sm" onClick={onExit}>
              الطاولات
            </button>
          )}
        </div>
      </div>

      {showSummary && (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-[11px]">
            <thead>
              <tr className="text-[#b9a486]">
                <th className="p-1 text-start">اليد</th>
                <th className="p-1">أوراقك</th>
                <th className="p-1">المجموع</th>
                <th className="p-1">الموزّع</th>
                <th className="p-1">الرهان</th>
                <th className="p-1">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {game.hands.map((h, i) => (
                <tr key={h.id} className="border-t border-[#4a351f]/60">
                  <td className="p-1 text-start">{i + 1}</td>
                  <td className="p-1 text-center font-pixel-en" dir="ltr">
                    {h.cards.map((c) => `${c.r}${c.s}`).join(" ")}
                  </td>
                  <td className="p-1 text-center font-pixel-en">{handValue(h.cards).total}</td>
                  <td className="p-1 text-center font-pixel-en" dir="ltr">
                    {game.dealer.map((c) => `${c.r}${c.s}`).join(" ")} ({handValue(game.dealer).total})
                  </td>
                  <td className="p-1 text-center font-pixel-en" dir="ltr">
                    {h.stake + h.doubledStake}
                  </td>
                  <td className={`p-1 text-center font-pixel-en ${outcomeTone(h.outcome) === "good" ? "text-[#7ef0b0]" : outcomeTone(h.outcome) === "bad" ? "text-[#ff9aa5]" : ""}`} dir="ltr">
                    {h.net > 0 ? "+" : ""}
                    {h.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="cas-stat">
              <b dir="ltr">{lastSettlement?.reserved ?? game.reserved}</b>
              <span>المخاطرة</span>
            </div>
            <div className="cas-stat">
              <b dir="ltr">{(lastSettlement?.returned ?? game.returned).toLocaleString("en-US")}</b>
              <span>العائد الإجمالي</span>
            </div>
            <div className="cas-stat">
              <b dir="ltr" className={net >= 0 ? "!text-[#7ef0b0]" : "!text-[#ff9aa5]"}>
                {net > 0 ? "+" : ""}
                {net}
              </b>
              <span>صافي الربح/الخسارة</span>
            </div>
            <div className="cas-stat">
              <b dir="ltr">{balance.toLocaleString("en-US")}</b>
              <span>الرصيد بعد الجولة {practice ? "(تدريب)" : ""}</span>
            </div>
          </div>
          {game.sideBetResults.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px]">
              {game.sideBetResults.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {SIDE_BET_LABEL_AR[r.id]} · {r.tier ? r.label : "لم تُصب"}
                  </span>
                  <b dir="ltr" className={r.net > 0 ? "text-[#7ef0b0]" : "text-[#ff9aa5]"}>
                    {r.net > 0 ? "+" : ""}
                    {r.net}
                  </b>
                </li>
              ))}
            </ul>
          )}
          {game.insurance.stake > 0 && (
            <p className="mt-1 text-[11px] text-[#b9a486]">
              التأمين: {game.insurance.result === "win" ? `دفع ${game.insurance.payout} (صافي +${game.insurance.payout - game.insurance.stake})` : `خسارة ${game.insurance.stake}`}
            </p>
          )}
          <button type="button" className="cas-btn cas-btn-sm mt-2" onClick={onCloseSummary}>
            إخفاء التفاصيل
          </button>
        </div>
      )}
    </div>
  );
}
