"use client";

/**
 * PixelPlayingCard — playing cards drawn as real pixel art.
 *
 * Ranks and suits are NOT text/emoji glyphs: every character and suit is a
 * hand-made bitmap rendered as crisp SVG rectangles (shapeRendering=
 * "crispEdges"), so edges stay square at any size. Card backs use a
 * generated pixel checker/diamond pattern in the site's arcade palette.
 */

import type { Card, Rank, Suit } from "@/lib/casino/cards";

/** 3×5 pixel font for ranks. Rows top→bottom, "1" = filled pixel. */
const CHAR_PIXELS: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "0": ["111", "101", "101", "101", "111"],
  J: ["001", "001", "001", "101", "010"],
  Q: ["010", "101", "101", "010", "001"],
  K: ["101", "100", "110", "101", "101"],
};

/** 7×7 pixel suits — each suit has a clearly distinct silhouette. */
export const SUIT_PIXELS: Record<Suit, string[]> = {
  H: ["0110110", "1111111", "1111111", "1111111", "0111110", "0011100", "0001000"],
  D: ["0001000", "0011100", "0111110", "1111111", "0111110", "0011100", "0001000"],
  S: ["0001000", "0011100", "0111110", "1111111", "1111111", "0011100", "0111110"],
  C: ["0011100", "0111110", "0011100", "1111111", "1111111", "0011100", "0111110"],
};

export const SUIT_RED_PIXEL: Record<Suit, boolean> = { S: false, H: true, D: true, C: false };

function PixelBitmap({
  rows,
  color,
  x = 0,
  y = 0,
  scale = 1,
}: {
  rows: string[];
  color: string;
  x?: number;
  y?: number;
  scale?: number;
}) {
  const rects: React.ReactNode[] = [];
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      if (cell === "1") {
        rects.push(
          <rect
            key={`${rx}-${ry}`}
            x={x + rx * scale}
            y={y + ry * scale}
            width={scale}
            height={scale}
            fill={color}
          />,
        );
      }
    });
  });
  return <g>{rects}</g>;
}

function RankBitmap({ rank, color, x, y, scale }: { rank: Rank; color: string; x: number; y: number; scale: number }) {
  const chars = [...rank]; // "10" renders two pixel digits side by side
  return (
    <g>
      {chars.map((ch, i) => (
        <PixelBitmap key={ch + i} rows={CHAR_PIXELS[ch]!} color={color} x={x + i * 4 * scale} y={y} scale={scale} />
      ))}
    </g>
  );
}

const rankWidth = (rank: Rank) => (rank.length === 2 ? 7 : 3); // in pixels

/**
 * A face-up pixel-art card. ViewBox is 28×40 (playing-card proportions);
 * it scales cleanly from table piles to the flying card.
 */
export function PixelPlayingCard({
  card,
  matched,
  className = "",
}: {
  card: Card;
  matched?: boolean;
  className?: string;
}) {
  const red = SUIT_RED_PIXEL[card.s];
  const ink = red ? "#dc2626" : "#1e293b";
  const suit = SUIT_PIXELS[card.s];
  return (
    <svg
      viewBox="0 0 28 40"
      className={`td-pixel-card ${matched ? "td-matched" : ""} ${className}`}
      role="img"
      aria-label={`بطاقة ${card.r} ${card.s}`}
      shapeRendering="crispEdges"
    >
      {/* card body: hard pixel border + subtle inner shading */}
      <rect x="0" y="0" width="28" height="40" fill="#f8fafc" />
      <rect x="0" y="0" width="28" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
      <rect x="2" y="36" width="24" height="2" fill="#cbd5e1" />
      {/* corner rank + suit (top) */}
      <RankBitmap rank={card.r} color={ink} x={2} y={2} scale={1} />
      <PixelBitmap rows={suit} color={ink} x={2} y={8} scale={0.55} />
      {/* corner rank + suit (bottom, rotated 180°) */}
      <g transform={`translate(28,40) rotate(180)`}>
        <RankBitmap rank={card.r} color={ink} x={2} y={2} scale={1} />
        <PixelBitmap rows={suit} color={ink} x={2} y={8} scale={0.55} />
      </g>
      {/* big centre suit */}
      <PixelBitmap rows={suit} color={ink} x={7} y={13} scale={2} />
      {/* rank watermark row under centre suit */}
      <RankBitmap rank={card.r} color={ink} x={14 - rankWidth(card.r)} y={29} scale={1} />
    </svg>
  );
}

/** Face-down pixel-art card back: checker + diamond pattern, theme colours. */
export function PixelCardBack({ className = "" }: { className?: string }) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 7; x++) {
      const diamond = Math.abs(x - 3) + Math.abs(y - 4.5) < 2.2;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x * 4}
          y={y * 4}
          width="4"
          height="4"
          fill={diamond ? "#fbbf24" : (x + y) % 2 === 0 ? "#1d4ed8" : "#172554"}
        />,
      );
    }
  }
  return (
    <svg
      viewBox="0 0 28 40"
      className={`td-pixel-card ${className}`}
      role="img"
      aria-label="ظهر البطاقة"
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width="28" height="40" fill="#172554" />
      {cells}
      <rect x="0" y="0" width="28" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
      <rect x="2" y="2" width="24" height="36" fill="none" stroke="#93c5fd" strokeWidth="1" />
    </svg>
  );
}
