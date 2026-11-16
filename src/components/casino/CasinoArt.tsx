"use client";

/**
 * CASINO ART — pixel-art playing cards, chips and table furniture.
 *
 * These are deliberately a separate visual language from the league theme:
 * warm felt, ivory cards, gold trim and printed chips. Everything is drawn with
 * CSS/borders (no images) so it stays crisp at any zoom and costs nothing.
 */

import { memo } from "react";
import type { Card as CardT } from "@/lib/casino/cards";
import { SUIT_GLYPH, SUIT_RED, SUIT_NAME_AR } from "@/lib/casino/cards";
import { CHIP_COLORS } from "@/lib/casino/settlement";

export type CardSize = "sm" | "md" | "lg";

const SIZES: Record<CardSize, { w: number; h: number; rank: number; suit: number }> = {
  sm: { w: 38, h: 54, rank: 12, suit: 12 },
  md: { w: 56, h: 80, rank: 17, suit: 17 },
  lg: { w: 72, h: 102, rank: 22, suit: 22 },
};

/** One playing card. `hidden` renders the printed card back. */
export const PlayingCard = memo(function PlayingCard({
  card,
  hidden = false,
  size = "md",
  index = 0,
  flipping = false,
  dim = false,
  highlight = false,
}: {
  card?: CardT | null;
  hidden?: boolean;
  size?: CardSize;
  index?: number;
  flipping?: boolean;
  dim?: boolean;
  highlight?: boolean;
}) {
  const s = SIZES[size];
  const red = card ? SUIT_RED[card.s] : false;
  return (
    <div
      className={`cas-card ${hidden ? "cas-card-back" : ""} ${flipping ? "cas-card-flip" : ""} ${
        dim ? "opacity-60" : ""
      } ${highlight ? "cas-card-highlight" : ""}`}
      style={{
        width: s.w,
        height: s.h,
        animationDelay: `${index * 0.09}s`,
        color: red ? "#c0203a" : "#1a1a24",
      }}
      aria-label={
        hidden ? "ورقة مقلوبة" : card ? `${card.r} ${SUIT_NAME_AR[card.s]}` : "مكان ورقة"
      }
      role="img"
    >
      {hidden ? (
        <span className="cas-card-back-art" aria-hidden />
      ) : card ? (
        <>
          <span className="cas-card-corner" style={{ fontSize: s.rank }}>
            <b>{card.r}</b>
            <i style={{ fontSize: s.suit }}>{SUIT_GLYPH[card.s]}</i>
          </span>
          <span className="cas-card-center" style={{ fontSize: s.suit * 1.9 }} aria-hidden>
            {SUIT_GLYPH[card.s]}
          </span>
          <span className="cas-card-corner cas-card-corner-b" style={{ fontSize: s.rank }}>
            <b>{card.r}</b>
            <i style={{ fontSize: s.suit }}>{SUIT_GLYPH[card.s]}</i>
          </span>
        </>
      ) : (
        <span className="cas-card-slot" aria-hidden />
      )}
    </div>
  );
});

/** A casino chip with a denomination and optional stack height. */
export function Chip({
  value,
  count = 1,
  size = 30,
  label,
}: {
  value: number;
  count?: number;
  size?: number;
  label?: string;
}) {
  const colors = CHIP_COLORS[value] ?? CHIP_COLORS[100]!;
  const stack = Math.min(4, Math.max(1, count));
  return (
    <span className="cas-chip-stack" style={{ width: size, height: size + (stack - 1) * 4 }}>
      {Array.from({ length: stack }, (_, i) => (
        <span
          key={i}
          className="cas-chip"
          style={{
            width: size,
            height: size,
            bottom: i * 4,
            background: colors.base,
            borderColor: colors.edge,
            color: colors.text,
            zIndex: i,
          }}
          aria-hidden
        >
          <span className="cas-chip-ring" style={{ borderColor: colors.text }} />
          <span className="cas-chip-value">{label ?? (value >= 1000 ? `${value / 1000}K` : value)}</span>
        </span>
      ))}
    </span>
  );
}

/** Decorative chip tray used in the betting bar. */
export function ChipRow({
  denominations,
  balance,
  onPick,
  disabled,
}: {
  denominations: number[];
  balance: number;
  onPick: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-2" role="group" aria-label="شرائح الرهان">
      {denominations.map((d) => (
        <button
          key={d}
          type="button"
          className="cas-chip-btn"
          onClick={() => onPick(d)}
          disabled={disabled || d > balance}
          title={d > balance ? "الرصيد لا يكفي لهذه الشريحة" : `أضف ${d} شيبس`}
          aria-label={`أضف ${d} شيبس إلى الرهان`}
        >
          <Chip value={d} size={34} />
        </button>
      ))}
    </div>
  );
}

/**
 * The table surface: felt, rails, printed arcs and the chip betting circle.
 * The printed payline is supplied by the rules of the selected table, so the
 * felt never advertises 3:2 on a 6:5 game. Sizing is handled purely in CSS
 * (media queries) instead of reading `window.innerWidth` during render, which
 * would mismatch the server-rendered markup.
 */
export function TableSurface({
  children,
  banner,
  payline,
  dealerLine,
}: {
  children: React.ReactNode;
  banner?: React.ReactNode;
  payline?: string;
  dealerLine?: string;
}) {
  return (
    <div className="cas-table">
      <div className="cas-table-rail" aria-hidden />
      <div className="cas-table-felt">
        <div className="cas-table-arc" aria-hidden>
          <span>{payline ?? "BLACKJACK PAYS 3 TO 2"}</span>
        </div>
        <div className="cas-table-arc cas-table-arc-2" aria-hidden>
          <span>{dealerLine ?? "DEALER MUST DRAW TO 16 AND STAND ON ALL 17s"}</span>
        </div>
        {banner && <div className="cas-table-banner">{banner}</div>}
        {children}
      </div>
    </div>
  );
}

/** A small dealer shoe illustration. */
export function DealerShoe({ remaining, total }: { remaining: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (remaining / Math.max(1, total)) * 100));
  return (
    <div className="flex items-center gap-2" aria-label={`الحذاء: ${remaining} من ${total}`}>
      <div className="cas-shoe" aria-hidden>
        <span style={{ height: `${pct}%` }} />
      </div>
      <span className="font-pixel-en text-[9px] text-[#e8dcc0]/70">{remaining}</span>
    </div>
  );
}
