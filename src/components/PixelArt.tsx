"use client";

import type { CSSProperties } from "react";

export type PixelIconName =
  | "home"
  | "trophy"
  | "crown"
  | "piggy"
  | "players"
  | "cards"
  | "swords"
  | "calendar"
  | "star"
  | "dice"
  | "palette"
  | "shield"
  | "coin"
  | "fire"
  | "bolt"
  | "sparkle"
  | "lock"
  | "chaos"
  | "megaphone"
  | "soundOn"
  | "soundOff"
  | "medal1"
  | "medal2"
  | "medal3"
  | "stone"
  | "comeback"
  | "search"
  | "key"
  | "target"
  | "chart"
  | "compass"
  | "handshake";

interface IconProps {
  name: PixelIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Crisp 16x16 retro 8-bit / 16-bit pixel art SVG sprites.
 * Every sprite uses integer coordinates on a 16x16 grid with shapeRendering="crispEdges".
 */
export function PixelIcon({ name, size = 20, className = "", style }: IconProps) {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    shapeRendering: "crispEdges" as const,
    className: `inline-block shrink-0 pixel-sprite ${className}`,
    style,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "crown":
      return (
        <svg {...base}>
          <rect x="2" y="4" width="2" height="2" fill="#fde047" />
          <rect x="7" y="2" width="2" height="2" fill="#fde047" />
          <rect x="12" y="4" width="2" height="2" fill="#fde047" />
          <rect x="2" y="6" width="12" height="5" fill="#f59e0b" />
          <rect x="4" y="5" width="2" height="2" fill="#f59e0b" />
          <rect x="7" y="4" width="2" height="3" fill="#f59e0b" />
          <rect x="10" y="5" width="2" height="2" fill="#f59e0b" />
          <rect x="3" y="8" width="2" height="2" fill="#ef4444" />
          <rect x="7" y="7" width="2" height="2" fill="#38bdf8" />
          <rect x="11" y="8" width="2" height="2" fill="#22c55e" />
          <rect x="2" y="11" width="12" height="2" fill="#b45309" />
          <rect x="3" y="11" width="10" height="1" fill="#fde047" />
        </svg>
      );

    case "piggy":
      return (
        <svg {...base}>
          {/* Coin slot */}
          <rect x="7" y="2" width="3" height="2" fill="#fbbf24" />
          {/* Ears */}
          <rect x="4" y="3" width="2" height="2" fill="#f472b6" />
          <rect x="10" y="3" width="2" height="2" fill="#f472b6" />
          {/* Body */}
          <rect x="3" y="5" width="10" height="6" fill="#f9a8d4" />
          <rect x="4" y="4" width="8" height="1" fill="#f9a8d4" />
          <rect x="6" y="5" width="4" height="1" fill="#831843" />
          {/* Snout */}
          <rect x="1" y="7" width="2" height="3" fill="#f472b6" />
          <rect x="1" y="8" width="1" height="1" fill="#831843" />
          {/* Eye + blush */}
          <rect x="4" y="6" width="1" height="2" fill="#1e1b4b" />
          <rect x="5" y="8" width="2" height="1" fill="#fb7185" />
          {/* Curly tail */}
          <rect x="13" y="6" width="2" height="1" fill="#ec4899" />
          <rect x="14" y="7" width="1" height="1" fill="#ec4899" />
          {/* Legs */}
          <rect x="4" y="11" width="2" height="2" fill="#ec4899" />
          <rect x="10" y="11" width="2" height="2" fill="#ec4899" />
          {/* Sweat drop */}
          <rect x="12" y="3" width="1" height="2" fill="#38bdf8" />
        </svg>
      );

    case "trophy":
      return (
        <svg {...base}>
          <rect x="4" y="2" width="8" height="6" fill="#facc15" />
          <rect x="5" y="3" width="2" height="3" fill="#fef08a" />
          <rect x="2" y="3" width="2" height="3" fill="#eab308" />
          <rect x="12" y="3" width="2" height="3" fill="#eab308" />
          <rect x="5" y="8" width="6" height="2" fill="#ca8a04" />
          <rect x="7" y="10" width="2" height="2" fill="#ca8a04" />
          <rect x="4" y="12" width="8" height="2" fill="#92400e" />
          <rect x="5" y="12" width="6" height="1" fill="#eab308" />
        </svg>
      );

    case "home":
      return (
        <svg {...base}>
          <rect x="7" y="2" width="2" height="2" fill="#ef4444" />
          <rect x="5" y="4" width="6" height="2" fill="#ef4444" />
          <rect x="3" y="6" width="10" height="2" fill="#dc2626" />
          <rect x="4" y="8" width="8" height="6" fill="#e2e8f0" />
          <rect x="7" y="10" width="2" height="4" fill="#92400e" />
          <rect x="5" y="9" width="1" height="2" fill="#38bdf8" />
          <rect x="10" y="9" width="1" height="2" fill="#38bdf8" />
        </svg>
      );

    case "players":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="4" height="4" fill="#fde68a" />
          <rect x="3" y="2" width="4" height="1" fill="#38bdf8" />
          <rect x="2" y="7" width="6" height="6" fill="#0284c7" />
          <rect x="9" y="4" width="4" height="4" fill="#fde68a" />
          <rect x="9" y="3" width="4" height="1" fill="#f43f5e" />
          <rect x="8" y="8" width="6" height="5" fill="#e11d48" />
        </svg>
      );

    case "cards":
      return (
        <svg {...base}>
          <rect x="2" y="3" width="8" height="11" fill="#cbd5e1" />
          <rect x="3" y="4" width="6" height="9" fill="#f8fafc" />
          <rect x="6" y="2" width="8" height="11" fill="#475569" />
          <rect x="7" y="3" width="6" height="9" fill="#ffffff" />
          <rect x="9" y="5" width="2" height="2" fill="#ef4444" />
          <rect x="8" y="6" width="4" height="2" fill="#ef4444" />
          <rect x="9" y="8" width="2" height="2" fill="#ef4444" />
        </svg>
      );

    case "swords":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="2" height="2" fill="#e2e8f0" />
          <rect x="4" y="4" width="2" height="2" fill="#e2e8f0" />
          <rect x="6" y="6" width="4" height="4" fill="#cbd5e1" />
          <rect x="12" y="2" width="2" height="2" fill="#e2e8f0" />
          <rect x="10" y="4" width="2" height="2" fill="#e2e8f0" />
          <rect x="4" y="10" width="2" height="2" fill="#94a3b8" />
          <rect x="10" y="10" width="2" height="2" fill="#94a3b8" />
          <rect x="2" y="12" width="3" height="2" fill="#f59e0b" />
          <rect x="11" y="12" width="3" height="2" fill="#f59e0b" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...base}>
          <rect x="4" y="2" width="2" height="2" fill="#94a3b8" />
          <rect x="10" y="2" width="2" height="2" fill="#94a3b8" />
          <rect x="2" y="4" width="12" height="3" fill="#ef4444" />
          <rect x="2" y="7" width="12" height="7" fill="#f8fafc" />
          <rect x="4" y="9" width="2" height="2" fill="#334155" />
          <rect x="7" y="9" width="2" height="2" fill="#f59e0b" />
          <rect x="10" y="9" width="2" height="2" fill="#334155" />
        </svg>
      );

    case "star":
      return (
        <svg {...base}>
          <rect x="7" y="1" width="2" height="3" fill="#fde047" />
          <rect x="5" y="4" width="6" height="2" fill="#facc15" />
          <rect x="1" y="6" width="14" height="2" fill="#facc15" />
          <rect x="3" y="8" width="10" height="2" fill="#eab308" />
          <rect x="4" y="10" width="3" height="2" fill="#eab308" />
          <rect x="9" y="10" width="3" height="2" fill="#eab308" />
          <rect x="3" y="12" width="2" height="2" fill="#ca8a04" />
          <rect x="11" y="12" width="2" height="2" fill="#ca8a04" />
        </svg>
      );

    case "dice":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="12" height="12" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="2" fill="#cbd5e1" />
          <rect x="4" y="4" width="2" height="2" fill="#1e293b" />
          <rect x="10" y="4" width="2" height="2" fill="#1e293b" />
          <rect x="7" y="7" width="2" height="2" fill="#ef4444" />
          <rect x="4" y="10" width="2" height="2" fill="#1e293b" />
          <rect x="10" y="10" width="2" height="2" fill="#1e293b" />
        </svg>
      );

    case "palette":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="10" height="8" fill="#475569" />
          <rect x="2" y="6" width="12" height="4" fill="#64748b" />
          <rect x="4" y="7" width="3" height="2" fill="#e2e8f0" />
          <rect x="5" y="6" width="1" height="4" fill="#e2e8f0" />
          <rect x="10" y="6" width="2" height="2" fill="#ef4444" />
          <rect x="11" y="8" width="2" height="2" fill="#22c55e" />
          <rect x="9" y="8" width="1" height="2" fill="#facc15" />
        </svg>
      );

    case "shield":
      return (
        <svg {...base}>
          <rect x="3" y="2" width="10" height="7" fill="#64748b" />
          <rect x="4" y="3" width="8" height="5" fill="#94a3b8" />
          <rect x="5" y="9" width="6" height="3" fill="#64748b" />
          <rect x="7" y="12" width="2" height="2" fill="#475569" />
          <rect x="7" y="4" width="2" height="6" fill="#38bdf8" />
          <rect x="5" y="5" width="6" height="2" fill="#38bdf8" />
        </svg>
      );

    case "coin":
      return (
        <svg {...base}>
          <rect x="5" y="2" width="6" height="12" fill="#eab308" />
          <rect x="4" y="4" width="8" height="8" fill="#facc15" />
          <rect x="6" y="4" width="4" height="8" fill="#fef08a" />
          <rect x="7" y="5" width="2" height="6" fill="#ca8a04" />
        </svg>
      );

    case "fire":
      return (
        <svg {...base}>
          <rect x="7" y="1" width="2" height="3" fill="#f97316" />
          <rect x="5" y="4" width="5" height="3" fill="#f97316" />
          <rect x="3" y="6" width="10" height="6" fill="#ef4444" />
          <rect x="5" y="8" width="6" height="4" fill="#facc15" />
          <rect x="7" y="10" width="2" height="2" fill="#fef08a" />
          <rect x="4" y="12" width="8" height="2" fill="#b91c1c" />
        </svg>
      );

    case "bolt":
      return (
        <svg {...base}>
          <rect x="8" y="1" width="4" height="3" fill="#fde047" />
          <rect x="6" y="4" width="4" height="3" fill="#facc15" />
          <rect x="4" y="7" width="8" height="2" fill="#fef08a" />
          <rect x="6" y="9" width="4" height="3" fill="#facc15" />
          <rect x="4" y="12" width="4" height="3" fill="#eab308" />
        </svg>
      );

    case "sparkle":
      return (
        <svg {...base}>
          <rect x="7" y="2" width="2" height="12" fill="#fde047" />
          <rect x="2" y="7" width="12" height="2" fill="#fde047" />
          <rect x="5" y="5" width="6" height="6" fill="#fef9c3" />
          <rect x="2" y="2" width="2" height="2" fill="#38bdf8" />
          <rect x="12" y="12" width="2" height="2" fill="#38bdf8" />
        </svg>
      );

    case "lock":
      return (
        <svg {...base}>
          <rect x="5" y="2" width="6" height="2" fill="#94a3b8" />
          <rect x="5" y="4" width="2" height="3" fill="#94a3b8" />
          <rect x="9" y="4" width="2" height="3" fill="#94a3b8" />
          <rect x="3" y="7" width="10" height="7" fill="#f59e0b" />
          <rect x="7" y="9" width="2" height="3" fill="#1e293b" />
        </svg>
      );

    case "chaos":
      return (
        <svg {...base}>
          <rect x="6" y="1" width="4" height="2" fill="#f43f5e" />
          <rect x="3" y="3" width="10" height="3" fill="#a855f7" />
          <rect x="2" y="6" width="12" height="5" fill="#ec4899" />
          <rect x="4" y="7" width="2" height="2" fill="#fde047" />
          <rect x="10" y="7" width="2" height="2" fill="#38bdf8" />
          <rect x="6" y="10" width="4" height="2" fill="#fef08a" />
          <rect x="4" y="12" width="8" height="2" fill="#7e22ce" />
        </svg>
      );

    case "megaphone":
      return (
        <svg {...base}>
          <rect x="9" y="3" width="3" height="8" fill="#facc15" />
          <rect x="5" y="5" width="4" height="4" fill="#ef4444" />
          <rect x="2" y="6" width="3" height="2" fill="#e2e8f0" />
          <rect x="5" y="9" width="2" height="4" fill="#94a3b8" />
          <rect x="13" y="4" width="2" height="1" fill="#38bdf8" />
          <rect x="13" y="7" width="2" height="1" fill="#38bdf8" />
          <rect x="13" y="10" width="2" height="1" fill="#38bdf8" />
        </svg>
      );

    case "soundOn":
      return (
        <svg {...base}>
          <rect x="2" y="6" width="3" height="4" fill="#e2e8f0" />
          <rect x="5" y="4" width="2" height="8" fill="#cbd5e1" />
          <rect x="7" y="2" width="2" height="12" fill="#f8fafc" />
          <rect x="11" y="5" width="1" height="6" fill="#22c55e" />
          <rect x="13" y="3" width="1" height="10" fill="#22c55e" />
        </svg>
      );

    case "soundOff":
      return (
        <svg {...base}>
          <rect x="2" y="6" width="3" height="4" fill="#94a3b8" />
          <rect x="5" y="4" width="2" height="8" fill="#64748b" />
          <rect x="7" y="2" width="2" height="12" fill="#94a3b8" />
          <rect x="11" y="5" width="2" height="2" fill="#ef4444" />
          <rect x="13" y="7" width="2" height="2" fill="#ef4444" />
          <rect x="11" y="9" width="2" height="2" fill="#ef4444" />
          <rect x="13" y="5" width="2" height="2" fill="#ef4444" />
          <rect x="13" y="9" width="2" height="2" fill="#ef4444" />
        </svg>
      );

    case "medal1":
      return (
        <svg {...base}>
          <rect x="5" y="1" width="2" height="4" fill="#ef4444" />
          <rect x="9" y="1" width="2" height="4" fill="#3b82f6" />
          <rect x="4" y="5" width="8" height="8" fill="#facc15" />
          <rect x="5" y="6" width="6" height="6" fill="#eab308" />
          <rect x="7" y="7" width="2" height="4" fill="#fef9c3" />
        </svg>
      );

    case "medal2":
      return (
        <svg {...base}>
          <rect x="5" y="1" width="2" height="4" fill="#ef4444" />
          <rect x="9" y="1" width="2" height="4" fill="#3b82f6" />
          <rect x="4" y="5" width="8" height="8" fill="#e2e8f0" />
          <rect x="5" y="6" width="6" height="6" fill="#94a3b8" />
          <rect x="6" y="7" width="4" height="4" fill="#f8fafc" />
        </svg>
      );

    case "medal3":
      return (
        <svg {...base}>
          <rect x="5" y="1" width="2" height="4" fill="#ef4444" />
          <rect x="9" y="1" width="2" height="4" fill="#3b82f6" />
          <rect x="4" y="5" width="8" height="8" fill="#fb923c" />
          <rect x="5" y="6" width="6" height="6" fill="#c2410c" />
          <rect x="6" y="7" width="4" height="4" fill="#fed7aa" />
        </svg>
      );

    case "stone":
      return (
        <svg {...base}>
          <rect x="5" y="2" width="6" height="2" fill="#38bdf8" />
          <rect x="3" y="4" width="10" height="8" fill="#0284c7" />
          <rect x="5" y="5" width="4" height="4" fill="#7dd3fc" />
          <rect x="5" y="12" width="6" height="2" fill="#0369a1" />
        </svg>
      );

    case "comeback":
      return (
        <svg {...base}>
          <rect x="4" y="3" width="8" height="2" fill="#22c55e" />
          <rect x="10" y="2" width="2" height="4" fill="#22c55e" />
          <rect x="3" y="5" width="2" height="5" fill="#22c55e" />
          <rect x="4" y="11" width="8" height="2" fill="#38bdf8" />
          <rect x="4" y="10" width="2" height="4" fill="#38bdf8" />
          <rect x="11" y="6" width="2" height="5" fill="#38bdf8" />
        </svg>
      );

    case "search":
      return (
        <svg {...base}>
          <rect x="4" y="2" width="6" height="2" fill="#38bdf8" />
          <rect x="2" y="4" width="2" height="5" fill="#38bdf8" />
          <rect x="10" y="4" width="2" height="5" fill="#38bdf8" />
          <rect x="4" y="9" width="6" height="2" fill="#38bdf8" />
          <rect x="10" y="10" width="2" height="2" fill="#94a3b8" />
          <rect x="12" y="12" width="2" height="2" fill="#cbd5e1" />
        </svg>
      );

    case "key":
      return (
        <svg {...base}>
          <rect x="2" y="5" width="5" height="5" fill="#facc15" />
          <rect x="3" y="6" width="3" height="3" fill="#1e293b" />
          <rect x="7" y="7" width="7" height="2" fill="#facc15" />
          <rect x="10" y="9" width="2" height="2" fill="#eab308" />
          <rect x="13" y="9" width="1" height="3" fill="#eab308" />
        </svg>
      );

    case "target":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="12" height="12" fill="#ef4444" />
          <rect x="4" y="4" width="8" height="8" fill="#f8fafc" />
          <rect x="6" y="6" width="4" height="4" fill="#ef4444" />
          <rect x="7" y="7" width="2" height="2" fill="#facc15" />
        </svg>
      );

    case "chart":
      return (
        <svg {...base}>
          <rect x="2" y="10" width="3" height="4" fill="#38bdf8" />
          <rect x="6" y="6" width="3" height="8" fill="#22c55e" />
          <rect x="10" y="3" width="3" height="11" fill="#facc15" />
          <rect x="1" y="14" width="14" height="1" fill="#94a3b8" />
        </svg>
      );

    case "compass":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="10" height="10" fill="#cbd5e1" />
          <rect x="4" y="4" width="8" height="8" fill="#1e293b" />
          <rect x="7" y="4" width="2" height="4" fill="#ef4444" />
          <rect x="7" y="8" width="2" height="4" fill="#f8fafc" />
        </svg>
      );

    case "handshake":
      return (
        <svg {...base}>
          <rect x="1" y="6" width="5" height="4" fill="#38bdf8" />
          <rect x="10" y="6" width="5" height="4" fill="#22c55e" />
          <rect x="5" y="5" width="6" height="5" fill="#fde68a" />
          <rect x="6" y="9" width="4" height="2" fill="#f59e0b" />
        </svg>
      );
  }
}

export function PixelCrownAnimated({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center pixel-crown-float ${className}`}>
      <PixelIcon name="crown" size={size} />
      <span className="pixel-glint" aria-hidden />
    </span>
  );
}

export function PixelPiggyMascot({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center pixel-piggy-wobble ${className}`}>
      <PixelIcon name="piggy" size={size} />
    </span>
  );
}

const ACH_ICON_MAP: Record<string, PixelIconName> = {
  first_victory: "medal1",
  first_season_victory: "sparkle",
  win3: "fire",
  win5: "bolt",
  win10: "chaos",
  comeback: "comeback",
  dominant: "swords",
  close: "stone",
  clean: "star",
  regular: "target",
  veteran: "shield",
  explorer: "compass",
  perfect_partner: "handshake",
  most_wins: "crown",
  best_partnership: "coin",
  most_improved: "chart",
  iron_wall: "lock",
  giant_killer: "trophy",
};

export function PixelAchievementIcon({
  achKey,
  unlocked,
  size = 26,
}: {
  achKey: string;
  unlocked: boolean;
  size?: number;
}) {
  const icon = ACH_ICON_MAP[achKey] ?? "trophy";
  return (
    <span className={unlocked ? "inline-flex" : "inline-flex opacity-45 grayscale"}>
      <PixelIcon name={icon} size={size} />
    </span>
  );
}

// Deterministic retro RPG character portrait from player id/name
const HAIR_PALETTES = ["#f59e0b", "#38bdf8", "#f43f5e", "#a855f7", "#22c55e", "#fb923c", "#e2e8f0", "#ec4899"];
const TUNIC_PALETTES = ["#1d4ed8", "#047857", "#be123c", "#6d28d9", "#b45309", "#0f766e", "#374151", "#9333ea"];
const SKIN_PALETTES = ["#fde68a", "#fed7aa", "#f5d0a9", "#d6a478"];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function PixelAvatar({
  id,
  name,
  size = 48,
  isLeader = false,
  isLastPlace = false,
  className = "",
}: {
  id: string;
  name: string;
  size?: number;
  isLeader?: boolean;
  isLastPlace?: boolean;
  className?: string;
}) {
  const h = hashStr(`${id}:${name}`);
  const hair = HAIR_PALETTES[h % HAIR_PALETTES.length];
  const tunic = TUNIC_PALETTES[(h >> 3) % TUNIC_PALETTES.length];
  const skin = SKIN_PALETTES[(h >> 6) % SKIN_PALETTES.length];
  const style = (h >> 8) % 3; // 0 = hero headband, 1 = wizard/cap, 2 = knight crest
  const bg = isLeader ? "#3b2c06" : isLastPlace ? "#3a1226" : "#151d38";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center pixel-frame ${
        isLeader ? "pixel-leader-frame" : isLastPlace ? "pixel-last-frame" : ""
      } ${className}`}
      style={{ width: size, height: size, background: bg }}
      aria-hidden
    >
      <svg width={size - 6} height={size - 6} viewBox="0 0 16 16" shapeRendering="crispEdges">
        {/* Background pixel stars */}
        <rect x="1" y="1" width="1" height="1" fill="rgba(255,255,255,0.22)" />
        <rect x="14" y="2" width="1" height="1" fill="rgba(255,255,255,0.22)" />
        {/* Hair / Helmet */}
        <rect x="4" y="2" width="8" height="3" fill={hair} />
        <rect x="3" y="4" width="2" height="4" fill={hair} />
        <rect x="11" y="4" width="2" height="4" fill={hair} />
        {style === 0 && <rect x="4" y="4" width="8" height="1" fill="#ffffff" />}
        {style === 1 && <rect x="6" y="1" width="4" height="1" fill={hair} />}
        {style === 2 && <rect x="7" y="1" width="2" height="3" fill="#facc15" />}
        {/* Face */}
        <rect x="5" y="5" width="6" height="5" fill={skin} />
        {/* Eyes */}
        <rect x="6" y="6" width="1" height="2" fill="#0f172a" />
        <rect x="9" y="6" width="1" height="2" fill="#0f172a" />
        {/* Mouth */}
        <rect x="7" y="9" width="2" height="1" fill={isLastPlace ? "#be123c" : "#78350f"} />
        {/* Tunic / Armor */}
        <rect x="3" y="10" width="10" height="5" fill={tunic} />
        <rect x="6" y="10" width="4" height="2" fill="#e2e8f0" />
        <rect x="7" y="12" width="2" height="3" fill="#facc15" />
      </svg>
      {isLeader && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2">
          <PixelCrownAnimated size={22} />
        </span>
      )}
      {!isLeader && isLastPlace && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <PixelPiggyMascot size={20} />
        </span>
      )}
    </div>
  );
}

/**
 * Retro pixel-segmented bar chart / meter.
 */
export function PixelMeter({
  value,
  max = 100,
  segments = 10,
  tone = "accent",
}: {
  value: number;
  max?: number;
  segments?: number;
  tone?: "accent" | "good" | "bad" | "neutral";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filled = Math.round(pct * segments);
  const fillColor =
    tone === "good"
      ? "bg-good"
      : tone === "bad"
        ? "bg-bad"
        : tone === "neutral"
          ? "bg-muted"
          : "bg-accent";

  return (
    <div className="flex gap-0.5 bg-bg p-1 border border-line" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 flex-1 ${i < filled ? fillColor : "bg-card2 opacity-40"}`}
        />
      ))}
    </div>
  );
}
